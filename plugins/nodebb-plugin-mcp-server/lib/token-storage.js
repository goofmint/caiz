'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');
const db = require.main.require('./src/database');

/**
 * Token Storage and Lifecycle Management
 * Handles secure token persistence with rotation tracking
 */
class TokenStorage {
    /**
     * Store access token with metadata
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {Object} tokenData - Token metadata
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<void>}
     */
    static async storeAccessToken(tokenHash, tokenData, ttl) {
        if (!tokenHash || !tokenData || !ttl) {
            throw new Error('Missing required parameters for access token storage');
        }

        const key = `oauth:access_token:${tokenHash}`;
        
        try {
            await db.set(key, JSON.stringify(tokenData));
            await db.expire(key, ttl);
            
            winston.verbose('[token-storage] Access token stored', { 
                hash: tokenHash.substring(0, 8) + '...',
                expires_in: ttl
            });
        } catch (err) {
            winston.error('[token-storage] Failed to store access token:', err);
            throw new Error('Failed to store access token');
        }
    }

    /**
     * Store refresh token with rotation tracking
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {Object} tokenData - Token metadata
     * @param {string} familyId - Rotation family ID
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<void>}
     */
    static async storeRefreshToken(tokenHash, tokenData, familyId, ttl) {
        if (!tokenHash || !tokenData || !familyId || !ttl) {
            throw new Error('Missing required parameters for refresh token storage');
        }

        const key = `oauth:refresh_token:${tokenHash}`;
        const familyKey = `oauth:token_family:${familyId}`;
        
        // Add rotation tracking
        const enrichedData = {
            ...tokenData,
            rotation_family_id: familyId,
            generation: (tokenData.generation || 0) + 1,
            created_at: Date.now(),
            used_at: null,
            revoked_at: null,
            revocation_reason: null
        };

        try {
            // Store refresh token
            await db.set(key, JSON.stringify(enrichedData));
            await db.expire(key, ttl);
            
            // Track in family (for family-wide revocation)
            await db.setAdd(familyKey, tokenHash);
            await db.expire(familyKey, ttl);
            
            winston.verbose('[token-storage] Refresh token stored', { 
                hash: tokenHash.substring(0, 8) + '...',
                family_id: familyId,
                generation: enrichedData.generation
            });
        } catch (err) {
            winston.error('[token-storage] Failed to store refresh token:', err);
            throw new Error('Failed to store refresh token');
        }
    }

    /**
     * Get token data by hash
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {string} tokenType - 'access' or 'refresh'
     * @returns {Promise<Object|null>} Token data or null if not found
     */
    static async getToken(tokenHash, tokenType) {
        if (!tokenHash || !tokenType) {
            return null;
        }

        const key = `oauth:${tokenType}_token:${tokenHash}`;
        
        try {
            const tokenDataJson = await db.get(key);
            if (!tokenDataJson) {
                return null;
            }

            const tokenData = JSON.parse(tokenDataJson);
            
            // Check if token is expired (double-check)
            if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
                await db.delete(key);
                return null;
            }

            return tokenData;
        } catch (err) {
            winston.error(`[token-storage] Failed to get ${tokenType} token:`, err);
            return null;
        }
    }

    /**
     * Rotate refresh token
     * @param {string} oldTokenHash - Hash of current refresh token
     * @param {string} newTokenHash - Hash of new refresh token
     * @param {Object} newTokenData - New token metadata
     * @returns {Promise<void>}
     */
    static async rotateRefreshToken(oldTokenHash, newTokenHash, newTokenData) {
        if (!oldTokenHash || !newTokenHash || !newTokenData) {
            throw new Error('Missing required parameters for token rotation');
        }

        const oldKey = `oauth:refresh_token:${oldTokenHash}`;
        const newKey = `oauth:refresh_token:${newTokenHash}`;
        
        try {
            // Get old token data
            const oldTokenDataJson = await db.get(oldKey);
            if (!oldTokenDataJson) {
                throw new Error('Old refresh token not found');
            }

            const oldTokenData = JSON.parse(oldTokenDataJson);
            
            // Mark old token as used (for breach detection)
            const revokedOldData = {
                ...oldTokenData,
                used_at: Date.now(),
                revoked_at: Date.now(),
                revocation_reason: 'rotated'
            };
            
            // Store revoked old token temporarily for breach detection
            await db.set(oldKey, JSON.stringify(revokedOldData));
            await db.expire(oldKey, 300); // 5 minutes for breach detection window

            // Store new token with incremented generation
            const enrichedNewData = {
                ...newTokenData,
                rotation_family_id: oldTokenData.rotation_family_id,
                generation: (oldTokenData.generation || 0) + 1,
                parent_token_hash: oldTokenHash,
                created_at: Date.now()
            };

            const ttl = Math.floor((enrichedNewData.expires_at - Date.now()) / 1000);
            await db.set(newKey, JSON.stringify(enrichedNewData));
            await db.expire(newKey, ttl);

            // Update family tracking
            const familyKey = `oauth:token_family:${oldTokenData.rotation_family_id}`;
            await db.setRemove(familyKey, oldTokenHash);
            await db.setAdd(familyKey, newTokenHash);

            winston.info('[token-storage] Refresh token rotated', {
                old_hash: oldTokenHash.substring(0, 8) + '...',
                new_hash: newTokenHash.substring(0, 8) + '...',
                family_id: oldTokenData.rotation_family_id,
                generation: enrichedNewData.generation
            });
        } catch (err) {
            winston.error('[token-storage] Failed to rotate refresh token:', err);
            throw new Error('Failed to rotate refresh token');
        }
    }

    /**
     * Revoke all tokens in rotation family (for security breach)
     * @param {string} familyId - Rotation family ID
     * @returns {Promise<number>} Number of revoked tokens
     */
    static async revokeTokenFamily(familyId) {
        if (!familyId) {
            return 0;
        }

        const familyKey = `oauth:token_family:${familyId}`;
        
        try {
            const tokenHashes = await db.getSetMembers(familyKey);
            let revokedCount = 0;

            for (const tokenHash of tokenHashes) {
                const key = `oauth:refresh_token:${tokenHash}`;
                const tokenDataJson = await db.get(key);
                
                if (tokenDataJson) {
                    const tokenData = JSON.parse(tokenDataJson);
                    const revokedData = {
                        ...tokenData,
                        revoked_at: Date.now(),
                        revocation_reason: 'security_breach'
                    };
                    
                    await db.set(key, JSON.stringify(revokedData));
                    await db.expire(key, 300); // Keep for 5 minutes for audit
                    revokedCount++;
                }
            }

            // Remove family tracking
            await db.delete(familyKey);

            winston.warn('[token-storage] Token family revoked due to security breach', {
                family_id: familyId,
                revoked_count: revokedCount
            });

            return revokedCount;
        } catch (err) {
            winston.error('[token-storage] Failed to revoke token family:', err);
            return 0;
        }
    }

    /**
     * Clean up expired tokens
     * @returns {Promise<number>} Number of removed tokens
     */
    static async cleanupExpiredTokens() {
        try {
            let cleanedCount = 0;
            const now = Date.now();

            // Cleanup access tokens
            const accessKeys = await db.keys('oauth:access_token:*');
            for (const key of accessKeys) {
                const tokenDataJson = await db.get(key);
                if (tokenDataJson) {
                    const tokenData = JSON.parse(tokenDataJson);
                    if (tokenData.expires_at && now > tokenData.expires_at) {
                        await db.delete(key);
                        cleanedCount++;
                    }
                }
            }

            // Cleanup refresh tokens
            const refreshKeys = await db.keys('oauth:refresh_token:*');
            for (const key of refreshKeys) {
                const tokenDataJson = await db.get(key);
                if (tokenDataJson) {
                    const tokenData = JSON.parse(tokenDataJson);
                    if (tokenData.expires_at && now > tokenData.expires_at) {
                        await db.delete(key);
                        cleanedCount++;
                        
                        // Remove from family tracking
                        if (tokenData.rotation_family_id) {
                            const familyKey = `oauth:token_family:${tokenData.rotation_family_id}`;
                            const tokenHash = key.replace('oauth:refresh_token:', '');
                            await db.setRemove(familyKey, tokenHash);
                        }
                    }
                }
            }

            // Cleanup device authorization codes
            const deviceKeys = await db.keys('oauth:device:*');
            for (const key of deviceKeys) {
                const deviceDataJson = await db.get(key);
                if (deviceDataJson) {
                    const deviceData = JSON.parse(deviceDataJson);
                    if (deviceData.expires_at && now > deviceData.expires_at) {
                        await db.delete(key);
                        cleanedCount++;
                    }
                }
            }

            if (cleanedCount > 0) {
                winston.info(`[token-storage] Cleaned up ${cleanedCount} expired tokens`);
            }

            return cleanedCount;
        } catch (err) {
            winston.error('[token-storage] Token cleanup failed:', err);
            return 0;
        }
    }

    /**
     * Check if token is revoked
     * @param {string} tokenHash - SHA-256 hash of the token
     * @returns {Promise<boolean>} True if revoked
     */
    static async isTokenRevoked(tokenHash) {
        if (!tokenHash) {
            return true;
        }

        try {
            const key = `oauth:refresh_token:${tokenHash}`;
            const tokenDataJson = await db.get(key);
            
            if (!tokenDataJson) {
                return true; // Not found = revoked
            }

            const tokenData = JSON.parse(tokenDataJson);
            return tokenData.revoked_at !== null;
        } catch (err) {
            winston.error('[token-storage] Failed to check revocation status:', err);
            return true; // Assume revoked on error
        }
    }

    /**
     * Track token usage for audit
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {Object} usageData - Usage metadata (ip, userAgent, timestamp)
     * @returns {Promise<void>}
     */
    static async trackTokenUsage(tokenHash, usageData) {
        if (!tokenHash || !usageData) {
            return;
        }

        try {
            const auditKey = `oauth:audit:${tokenHash}`;
            const auditEntry = {
                ...usageData,
                timestamp: Date.now()
            };

            // Store last 10 usage entries
            await db.listLeftPush(auditKey, JSON.stringify(auditEntry));
            await db.listTrim(auditKey, 0, 9); // Keep only last 10
            await db.expire(auditKey, 7 * 24 * 3600); // 7 days

            winston.verbose('[token-storage] Token usage tracked', {
                hash: tokenHash.substring(0, 8) + '...',
                ip: usageData.ip
            });
        } catch (err) {
            winston.warn('[token-storage] Failed to track token usage:', err);
            // Don't throw - this is non-critical
        }
    }
}

module.exports = TokenStorage;