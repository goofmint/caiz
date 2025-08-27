'use strict';

const crypto = require('crypto');
const db = require.main.require('./src/database');
const winston = require.main.require('winston');

/**
 * Token Storage Manager
 * Handles token persistence and lifecycle management using NodeBB database
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
            throw new Error('Invalid parameters for storing access token');
        }

        const key = `oauth:access_token:${tokenHash}`;
        await db.set(key, JSON.stringify(tokenData));
        await db.expire(key, ttl);

        winston.verbose('[mcp-server] Access token stored', { 
            user_id: tokenData.user_id, 
            client_id: tokenData.client_id,
            expires_at: tokenData.expires_at
        });
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
            throw new Error('Invalid parameters for storing refresh token');
        }

        const enhancedData = {
            ...tokenData,
            rotation_family_id: familyId,
            generation: tokenData.generation || 1,
            used_at: null,
            revoked_at: null,
            revocation_reason: null
        };

        const key = `oauth:refresh_token:${tokenHash}`;
        await db.set(key, JSON.stringify(enhancedData));
        await db.expire(key, ttl);

        // Track family for revocation purposes
        const familyKey = `oauth:token_family:${familyId}`;
        await db.setAdd(familyKey, tokenHash);
        await db.expire(familyKey, ttl);

        winston.verbose('[mcp-server] Refresh token stored', { 
            user_id: tokenData.user_id, 
            client_id: tokenData.client_id,
            family_id: familyId,
            generation: enhancedData.generation
        });
    }

    /**
     * Get token data by hash
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {string} tokenType - 'access' or 'refresh'
     * @returns {Promise<Object|null>} Token data or null if not found
     */
    static async getToken(tokenHash, tokenType) {
        if (!tokenHash || !['access', 'refresh'].includes(tokenType)) {
            throw new Error('Invalid parameters for token retrieval');
        }

        const key = `oauth:${tokenType}_token:${tokenHash}`;
        const tokenDataJson = await db.get(key);
        
        if (!tokenDataJson) {
            return null;
        }

        try {
            const tokenData = JSON.parse(tokenDataJson);
            
            // Check expiration
            if (Date.now() > tokenData.expires_at) {
                await db.delete(key);
                winston.verbose('[mcp-server] Expired token removed', { type: tokenType, hash: tokenHash.substring(0, 8) });
                return null;
            }

            return tokenData;
        } catch (err) {
            winston.error('[mcp-server] Failed to parse token data', { error: err.message });
            await db.delete(key);
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
            throw new Error('Invalid parameters for token rotation');
        }

        // Get old token data for family tracking
        const oldTokenData = await TokenStorage.getToken(oldTokenHash, 'refresh');
        if (!oldTokenData) {
            throw new Error('Old refresh token not found or expired');
        }

        // Mark old token as rotated
        oldTokenData.used_at = Date.now();
        oldTokenData.revocation_reason = 'rotated';
        oldTokenData.revoked_at = Date.now();
        
        const oldKey = `oauth:refresh_token:${oldTokenHash}`;
        await db.set(oldKey, JSON.stringify(oldTokenData));
        await db.expire(oldKey, 3600); // Keep for 1 hour for audit

        // Store new token with incremented generation
        const familyId = oldTokenData.rotation_family_id;
        const enhancedNewData = {
            ...newTokenData,
            rotation_family_id: familyId,
            generation: (oldTokenData.generation || 1) + 1,
            parent_token_hash: oldTokenHash
        };

        await TokenStorage.storeRefreshToken(
            newTokenHash, 
            enhancedNewData, 
            familyId, 
            Math.floor((newTokenData.expires_at - Date.now()) / 1000)
        );

        winston.info('[mcp-server] Refresh token rotated', { 
            old_generation: oldTokenData.generation,
            new_generation: enhancedNewData.generation,
            family_id: familyId
        });
    }

    /**
     * Revoke all tokens in rotation family (for security breach)
     * @param {string} familyId - Rotation family ID
     * @returns {Promise<number>} Number of revoked tokens
     */
    static async revokeTokenFamily(familyId) {
        if (!familyId) {
            throw new Error('Family ID required for revocation');
        }

        const familyKey = `oauth:token_family:${familyId}`;
        const tokenHashes = await db.getSetMembers(familyKey);
        
        if (!tokenHashes || tokenHashes.length === 0) {
            return 0;
        }

        let revokedCount = 0;
        const now = Date.now();

        for (const tokenHash of tokenHashes) {
            try {
                const tokenData = await TokenStorage.getToken(tokenHash, 'refresh');
                if (tokenData) {
                    tokenData.revoked_at = now;
                    tokenData.revocation_reason = 'security_breach';
                    
                    const key = `oauth:refresh_token:${tokenHash}`;
                    await db.set(key, JSON.stringify(tokenData));
                    await db.expire(key, 86400); // Keep for 24 hours for audit
                    
                    revokedCount++;
                }
            } catch (err) {
                winston.error('[mcp-server] Failed to revoke token in family', { 
                    family_id: familyId, 
                    token_hash: tokenHash.substring(0, 8), 
                    error: err.message 
                });
            }
        }

        // Clean up family tracking
        await db.delete(familyKey);

        winston.warn('[mcp-server] Token family revoked', { 
            family_id: familyId, 
            revoked_count: revokedCount 
        });

        return revokedCount;
    }

    /**
     * Clean up expired tokens
     * @returns {Promise<number>} Number of removed tokens
     */
    static async cleanupExpiredTokens() {
        let cleanupCount = 0;
        const now = Date.now();

        // Cleanup access tokens
        const accessTokenKeys = await db.keys('oauth:access_token:*');
        for (const key of accessTokenKeys || []) {
            try {
                const tokenDataJson = await db.get(key);
                if (tokenDataJson) {
                    const tokenData = JSON.parse(tokenDataJson);
                    if (now > tokenData.expires_at) {
                        await db.delete(key);
                        cleanupCount++;
                    }
                }
            } catch (err) {
                // Delete corrupted entries
                await db.delete(key);
                cleanupCount++;
            }
        }

        // Cleanup refresh tokens
        const refreshTokenKeys = await db.keys('oauth:refresh_token:*');
        for (const key of refreshTokenKeys || []) {
            try {
                const tokenDataJson = await db.get(key);
                if (tokenDataJson) {
                    const tokenData = JSON.parse(tokenDataJson);
                    if (now > tokenData.expires_at) {
                        await db.delete(key);
                        cleanupCount++;
                    }
                }
            } catch (err) {
                // Delete corrupted entries
                await db.delete(key);
                cleanupCount++;
            }
        }

        if (cleanupCount > 0) {
            winston.verbose('[mcp-server] Cleaned up expired tokens', { count: cleanupCount });
        }

        return cleanupCount;
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

        const tokenData = await TokenStorage.getToken(tokenHash, 'refresh');
        return tokenData ? Boolean(tokenData.revoked_at) : true;
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

        const usageKey = `oauth:token_usage:${tokenHash}`;
        const usageRecord = {
            timestamp: usageData.timestamp || Date.now(),
            ip: usageData.ip,
            userAgent: usageData.userAgent
        };

        // Store latest usage
        await db.set(usageKey, JSON.stringify(usageRecord));
        await db.expire(usageKey, 7 * 24 * 3600); // 7 days

        winston.verbose('[mcp-server] Token usage tracked', { 
            hash: tokenHash.substring(0, 8),
            ip: usageData.ip
        });
    }

    /**
     * Hash token using SHA-256
     * @param {string} token - Base64URL encoded token
     * @returns {string} Hex encoded hash
     */
    static hashToken(token) {
        if (!token) {
            throw new Error('Token required for hashing');
        }

        return crypto
            .createHash('sha256')
            .update(Buffer.from(token, 'base64url'))
            .digest('hex');
    }

    /**
     * Generate cryptographically secure token
     * @param {number} length - Length in bytes (default: 32)
     * @returns {string} Base64URL encoded token
     */
    static generateSecureToken(length = 32) {
        const bytes = crypto.randomBytes(length);
        return bytes
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
}

module.exports = TokenStorage;