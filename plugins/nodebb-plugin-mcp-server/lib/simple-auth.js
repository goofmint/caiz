'use strict';

const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');

/**
 * Bearer Token Authentication for MCP using Caiz API Token system
 * Integrates with nodebb-plugin-caiz API token management
 */
class SimpleAuth {
    /**
     * Get Caiz API token module
     * @returns {Object|null} API tokens module or null if unavailable
     */
    static getCaizApiTokensModule() {
        try {
            return require('../../nodebb-plugin-caiz/libs/api-tokens');
        } catch (err) {
            winston.warn('[mcp-server] Caiz API tokens module not found:', err.message);
            return null;
        }
    }

    /**
     * Extract Bearer token from request
     * @param {Object} req - Express request
     * @returns {string|null} Bearer token or null
     */
    static extractBearerToken(req) {
        const authHeader = req.get('Authorization');
        if (!authHeader) {
            return null;
        }

        const parts = authHeader.trim().split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            return null;
        }
        
        const token = parts[1].trim();
        if (!token) {
            return null;
        }
        
        return token;
    }

    /**
     * Validate Bearer token using Caiz API token system
     * @param {string} token - Token to validate
     * @returns {Promise<Object|null>} User info if valid, null if invalid
     */
    static async validateApiToken(token) {
        if (!token || typeof token !== 'string') {
            return null;
        }
        
        // Token format validation: uuid.base64url
        const parts = token.split('.');
        if (parts.length !== 2) {
            return null;
        }
        
        const [tokenId, secret] = parts;
        
        // Basic UUID format check (simplified)
        if (!tokenId || tokenId.length < 32) {
            return null;
        }
        
        // Base64URL format check (simplified)
        if (!secret || !/^[A-Za-z0-9_-]+$/.test(secret)) {
            return null;
        }
        
        try {
            const caizTokens = this.getCaizApiTokensModule();
            if (!caizTokens) {
                winston.warn('[mcp-server] Caiz API tokens module not available');
                return null;
            }
            
            const db = require.main.require('./src/database');
            
            // Get token data from database
            const tokenData = await db.getObject(`api-token:${tokenId}`);
            
            if (!tokenData || tokenData.revoked_at) {
                winston.info(`[mcp-server] Token validation failed: token not found or revoked - ${tokenId}`);
                return null;
            }
            
            // Verify token hash
            const isValid = caizTokens.verifyToken(token, tokenData.token_hash);
            if (!isValid) {
                winston.warn(`[mcp-server] Token validation failed: hash mismatch - ${tokenId}`);
                return null;
            }
            
            // Check if token is active
            if (tokenData.is_active === 'false') {
                winston.info(`[mcp-server] Token validation failed: token inactive - ${tokenId}`);
                return null;
            }
            
            // Check expiration - normalize to milliseconds
            if (tokenData.expires_at) {
                let expiresAt = parseInt(tokenData.expires_at, 10);
                // If timestamp looks like seconds (< 1e12), convert to milliseconds
                if (expiresAt < 1e12) {
                    expiresAt *= 1000;
                }
                if (expiresAt < Date.now()) {
                    winston.info(`[mcp-server] Token validation failed: token expired - ${tokenId.substring(0, 6)}...`);
                    return null;
                }
            }
            
            // Get user information
            const User = require.main.require('./src/user');
            const uid = parseInt(tokenData.uid, 10);
            const userData = await User.getUserData(uid);
            
            if (!userData) {
                winston.warn(`[mcp-server] Token validation failed: user not found - uid: ${uid}`);
                return null;
            }
            
            // Update last used timestamp
            await this.updateTokenLastUsed(tokenId);
            
            return {
                uid: uid,
                username: userData.username,
                email: userData.email,
                displayname: userData.displayname || userData.username,
                token: {
                    id: tokenId,
                    name: tokenData.name,
                    permissions: JSON.parse(tokenData.permissions || '[]'),
                    created_at: parseInt(tokenData.created_at, 10),
                    last_used_at: Date.now()
                }
            };
        } catch (err) {
            winston.error(`[mcp-server] Token validation error: ${err.message}`);
            return null;
        }
    }

    /**
     * Update token's last used timestamp
     * @param {string} tokenId - Token ID
     * @returns {Promise<void>}
     */
    static async updateTokenLastUsed(tokenId) {
        try {
            const db = require.main.require('./src/database');
            await db.setObjectField(`api-token:${tokenId}`, 'last_used_at', Date.now());
        } catch (err) {
            winston.warn(`[mcp-server] Failed to update token last_used_at: ${err.message}`);
        }
    }

    /**
     * Legacy method for backward compatibility - now uses Caiz API tokens
     * @param {string} token - Token to validate
     * @returns {Promise<boolean>} True if valid
     */
    static async validateToken(token) {
        const userInfo = await this.validateApiToken(token);
        return userInfo !== null;
    }

    /**
     * Create authentication middleware using Caiz API tokens
     * @returns {Function} Express middleware
     */
    static requireAuth() {
        return async (req, res, next) => {
            winston.verbose('[mcp-server] API token auth middleware executing');
            winston.verbose('[mcp-server] Authorization header present:', !!req.headers.authorization);

            const token = this.extractBearerToken(req);
            
            if (!token) {
                winston.verbose('[mcp-server] No Bearer token provided');
                res.setHeader('WWW-Authenticate', 'Bearer realm="NodeBB API", error="invalid_request", error_description="Missing or invalid Authorization header"');
                return res.status(401).json({
                    error: 'invalid_request',
                    error_description: 'Missing or invalid Authorization header'
                });
            }

            const userInfo = await this.validateApiToken(token);
            
            if (!userInfo) {
                winston.verbose('[mcp-server] Invalid Bearer token');
                res.setHeader('WWW-Authenticate', 'Bearer realm="NodeBB API", error="invalid_token", error_description="The access token provided is invalid"');
                return res.status(401).json({
                    error: 'invalid_token',
                    error_description: 'The access token provided is invalid'
                });
            }

            // Set authentication context with user information
            const tokenPermissions = userInfo.token.permissions || [];
            // Validate and ensure permissions is array of strings
            const validScopes = Array.isArray(tokenPermissions) 
                ? tokenPermissions.filter(p => typeof p === 'string')
                : [];
            
            req.auth = {
                authenticated: true,
                type: 'bearer',
                userId: userInfo.uid,
                username: userInfo.username,
                email: userInfo.email,
                displayname: userInfo.displayname,
                token: userInfo.token,
                scopes: validScopes // Use actual token permissions, not hardcoded
            };

            winston.verbose('[mcp-server] Authentication successful for user:', userInfo.uid);
            next();
        };
    }

    /**
     * Optional authentication middleware using Caiz API tokens
     * @returns {Function} Express middleware
     */
    static optionalAuth() {
        return async (req, res, next) => {
            const token = this.extractBearerToken(req);
            
            if (token) {
                const userInfo = await this.validateApiToken(token);
                
                if (userInfo) {
                    const tokenPermissions = userInfo.token.permissions || [];
                    const validScopes = Array.isArray(tokenPermissions) 
                        ? tokenPermissions.filter(p => typeof p === 'string')
                        : [];
                    
                    req.auth = {
                        authenticated: true,
                        type: 'bearer',
                        userId: userInfo.uid,
                        username: userInfo.username,
                        email: userInfo.email,
                        displayname: userInfo.displayname,
                        token: userInfo.token,
                        scopes: validScopes
                    };
                    winston.verbose('[mcp-server] Optional authentication successful for user:', userInfo.uid);
                } else {
                    winston.verbose('[mcp-server] Optional authentication failed - invalid token');
                }
            } else {
                winston.verbose('[mcp-server] Optional authentication skipped - no token');
            }

            next();
        };
    }

    /**
     * Generate a random API token for configuration
     * @returns {string} Random token
     */
    static generateToken() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = SimpleAuth;