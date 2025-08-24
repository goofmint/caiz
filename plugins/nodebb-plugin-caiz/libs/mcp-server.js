'use strict';

const apiTokens = require('./api-tokens');

/**
 * Extract Bearer token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null if invalid
 */
function extractBearerToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') {
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
 * Validate API token and return user information
 * @param {string} token - Token to validate (format: uuid.base64url)
 * @returns {Promise<Object|null>} User info or null if invalid
 */
async function validateApiToken(token) {
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
        const db = require.main.require('./src/database');
        const winston = require.main.require('winston');
        
        // Get token data from database
        const tokenData = await db.getObject(`api-token:${tokenId}`);
        
        if (!tokenData || tokenData.revoked_at) {
            winston.info(`[caiz] Token validation failed: token not found or revoked - ${tokenId}`);
            return null;
        }
        
        // Verify token hash
        const isValid = apiTokens.verifyToken(token, tokenData.token_hash);
        if (!isValid) {
            winston.warn(`[caiz] Token validation failed: hash mismatch - ${tokenId}`);
            return null;
        }
        
        // Check if token is active
        if (tokenData.is_active === 'false') {
            winston.info(`[caiz] Token validation failed: token inactive - ${tokenId}`);
            return null;
        }
        
        // Check expiration
        if (tokenData.expires_at && parseInt(tokenData.expires_at, 10) < Date.now()) {
            winston.info(`[caiz] Token validation failed: token expired - ${tokenId}`);
            return null;
        }
        
        // Get user information
        const User = require.main.require('./src/user');
        const uid = parseInt(tokenData.uid, 10);
        const userData = await User.getUserData(uid);
        
        if (!userData) {
            winston.warn(`[caiz] Token validation failed: user not found - uid: ${uid}`);
            return null;
        }
        
        // Update last used timestamp
        await updateTokenLastUsed(tokenId);
        
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
        const winston = require.main.require('winston');
        winston.error(`[caiz] Token validation error: ${err.message}`);
        return null;
    }
}

/**
 * Update token's last used timestamp
 * @param {string} tokenId - Token ID
 * @returns {Promise<void>}
 */
async function updateTokenLastUsed(tokenId) {
    try {
        const db = require.main.require('./src/database');
        await db.setObjectField(`api-token:${tokenId}`, 'last_used_at', Date.now());
    } catch (err) {
        const winston = require.main.require('winston');
        winston.warn(`[caiz] Failed to update token last_used_at: ${err.message}`);
    }
}

module.exports = {
    extractBearerToken,
    validateApiToken,
    updateTokenLastUsed
};