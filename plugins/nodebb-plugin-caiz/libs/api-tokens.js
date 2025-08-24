'use strict';

const crypto = require('crypto');
const db = require.main.require('./src/database');
const winston = require.main.require('winston');
const { v7: uuidv7 } = require('uuid');

const MAX_TOKEN_NAME_LENGTH = 100;
const MIN_TOKEN_NAME_LENGTH = 1;
const ALLOWED_PERMISSIONS = ['read', 'write']; // 将来拡張可能

/**
 * Generate secure API token
 * @returns {Object} { token, tokenId, prefix }
 */
function generateApiToken() {
    const secret = crypto.randomBytes(32);
    const secretB64u = secret.toString('base64url');
    const tokenId = uuidv7();
    const prefix = secretB64u.slice(0, 8);
    
    return {
        token: `${tokenId}.${secretB64u}`,
        tokenId: tokenId,
        prefix: prefix
    };
}

/**
 * Hash token using SHA-256 (tokens are already high-entropy)
 * @param {string} token - The token to hash
 * @returns {string} Hexadecimal hash
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify token against stored hash using timing-safe comparison
 * @param {string} token - The token to verify
 * @param {string} storedHash - The stored hash
 * @returns {boolean} True if token is valid
 */
function verifyToken(token, storedHash) {
    const expected = hashToken(token);
    
    const actual = Buffer.from(storedHash, 'hex');
    const predicted = Buffer.from(expected, 'hex');
    
    return crypto.timingSafeEqual(predicted, actual);
}

/**
 * Validate token name
 * @param {string} name - Token name to validate
 * @throws {Error} If validation fails
 */
function validateTokenName(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('[[error:invalid-data]]');
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length < MIN_TOKEN_NAME_LENGTH || trimmedName.length > MAX_TOKEN_NAME_LENGTH) {
        throw new Error(`[[caiz:error.token-name-length]]`);
    }
    
    return trimmedName;
}

/**
 * Validate permissions array
 * @param {Array} permissions - Permissions to validate
 * @throws {Error} If validation fails
 */
function validatePermissions(permissions) {
    if (!Array.isArray(permissions)) {
        throw new Error('[[caiz:error.invalid-permissions]]');
    }
    
    for (const permission of permissions) {
        if (!ALLOWED_PERMISSIONS.includes(permission)) {
            throw new Error('[[caiz:error.invalid-permission-scope]]');
        }
    }
    
    return permissions;
}

/**
 * Get user's API tokens (excluding sensitive data)
 * @param {number} uid - User ID
 * @returns {Promise<Array>} Array of token metadata
 */
async function getUserTokens(uid) {
    if (!uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    
    // Get list of token IDs for user
    const tokenIds = await db.getSortedSetRevRange(`uid:${uid}:api-tokens`, 0, -1) || [];
    
    if (!tokenIds.length) {
        return [];
    }
    
    // Get token data for each ID
    const tokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
            const token = await db.getObject(`api-token:${tokenId}`);
            if (!token || token.revoked_at) {
                return null;
            }
            
            return {
                id: token.token_id,
                name: token.name,
                prefix: token.token_prefix,
                permissions: JSON.parse(token.permissions || '[]'),
                isActive: token.is_active !== 'false',
                createdAt: parseInt(token.created_at, 10),
                updatedAt: parseInt(token.updated_at, 10),
                lastUsedAt: token.last_used_at ? parseInt(token.last_used_at, 10) : null,
                expiresAt: token.expires_at ? parseInt(token.expires_at, 10) : null
            };
        })
    );
    
    return tokens.filter(Boolean);
}

/**
 * Check if token name is unique for user
 * @param {number} uid - User ID
 * @param {string} name - Token name
 * @param {string} excludeTokenId - Token ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if name is unique
 */
async function isTokenNameUnique(uid, name, excludeTokenId = null) {
    const tokenIds = await db.getSortedSetRevRange(`uid:${uid}:api-tokens`, 0, -1) || [];
    
    for (const tokenId of tokenIds) {
        if (excludeTokenId && tokenId === excludeTokenId) {
            continue;
        }
        
        const token = await db.getObject(`api-token:${tokenId}`);
        if (token && !token.revoked_at && token.name.toLowerCase() === name.toLowerCase()) {
            return false;
        }
    }
    
    return true;
}

/**
 * Create new API token
 * @param {number} uid - User ID
 * @param {Object} data - Token data { name, permissions }
 * @returns {Promise<Object>} Created token with secret
 */
async function createToken(uid, data) {
    if (!uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    
    const name = validateTokenName(data.name);
    const permissions = validatePermissions(data.permissions || ['read']);
    
    // Check name uniqueness
    const isUnique = await isTokenNameUnique(uid, name);
    if (!isUnique) {
        throw new Error('[[caiz:error.token-name-exists]]');
    }
    
    // Generate token
    const { token, tokenId, prefix } = generateApiToken();
    const tokenHash = hashToken(token);
    const now = Date.now();
    
    // Store token data
    const tokenData = {
        token_id: tokenId,
        uid: uid,
        name: name,
        token_prefix: prefix,
        token_hash: tokenHash,
        permissions: JSON.stringify(permissions),
        is_active: true,
        created_at: now,
        updated_at: now,
        last_used_at: null,
        expires_at: null,
        revoked_at: null
    };
    
    // Save to database
    await db.setObject(`api-token:${tokenId}`, tokenData);
    
    // Add to user's token list (sorted by creation time)
    await db.sortedSetAdd(`uid:${uid}:api-tokens`, now, tokenId);
    
    // Store token hash mapping for quick lookup
    await db.setObject(`api-token-hash:${tokenHash}`, { token_id: tokenId });
    
    winston.info(`[caiz] API token created for user ${uid}, token_id: ${tokenId}`);
    
    return {
        token: token,
        id: tokenId,
        name: name,
        prefix: prefix,
        permissions: permissions,
        isActive: true,
        createdAt: now
    };
}

/**
 * Update API token metadata
 * @param {number} uid - User ID
 * @param {string} tokenId - Token ID
 * @param {Object} data - Update data { name, isActive, permissions, expiresAt }
 * @returns {Promise<Object>} Updated token metadata
 */
async function updateToken(uid, tokenId, data) {
    if (!uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    
    // Check token exists and belongs to user
    const existing = await db.getObject(`api-token:${tokenId}`);
    
    if (!existing || existing.uid != uid || existing.revoked_at) {
        throw new Error('[[caiz:error.token-not-found]]');
    }
    
    const updates = {};
    
    // Validate and prepare updates
    if (data.name !== undefined) {
        const name = validateTokenName(data.name);
        const isUnique = await isTokenNameUnique(uid, name, tokenId);
        if (!isUnique) {
            throw new Error('[[caiz:error.token-name-exists]]');
        }
        updates.name = name;
    }
    
    if (data.isActive !== undefined) {
        updates.is_active = Boolean(data.isActive);
    }
    
    if (data.permissions !== undefined) {
        const permissions = validatePermissions(data.permissions);
        updates.permissions = JSON.stringify(permissions);
    }
    
    if (data.expiresAt !== undefined) {
        if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
            throw new Error('[[caiz:error.invalid-expiry-date]]');
        }
        updates.expires_at = data.expiresAt ? new Date(data.expiresAt).getTime() : null;
    }
    
    if (Object.keys(updates).length === 0) {
        throw new Error('[[error:no-changes]]');
    }
    
    // Add updated_at
    updates.updated_at = Date.now();
    
    // Update in database
    await db.setObject(`api-token:${tokenId}`, updates);
    
    winston.info(`[caiz] API token updated: ${tokenId} by user ${uid}`);
    
    // Return updated token metadata
    const updated = await db.getObject(`api-token:${tokenId}`);
    
    return {
        id: updated.token_id,
        name: updated.name,
        prefix: updated.token_prefix,
        permissions: JSON.parse(updated.permissions || '[]'),
        isActive: updated.is_active !== 'false',
        createdAt: parseInt(updated.created_at, 10),
        updatedAt: parseInt(updated.updated_at, 10),
        lastUsedAt: updated.last_used_at ? parseInt(updated.last_used_at, 10) : null,
        expiresAt: updated.expires_at ? parseInt(updated.expires_at, 10) : null
    };
}

/**
 * Delete API token
 * @param {number} uid - User ID
 * @param {string} tokenId - Token ID to delete
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteToken(uid, tokenId) {
    if (!uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    
    // Check token exists and belongs to user
    const existing = await db.getObject(`api-token:${tokenId}`);
    
    if (!existing || existing.uid != uid || existing.revoked_at) {
        throw new Error('[[caiz:error.token-not-found]]');
    }
    
    // Soft delete by setting revoked_at
    const now = Date.now();
    await db.setObject(`api-token:${tokenId}`, {
        revoked_at: now,
        updated_at: now
    });
    
    // Remove from user's token list
    await db.sortedSetRemove(`uid:${uid}:api-tokens`, tokenId);
    
    // Remove hash mapping
    if (existing.token_hash) {
        await db.delete(`api-token-hash:${existing.token_hash}`);
    }
    
    winston.info(`[caiz] API token deleted: ${tokenId} by user ${uid}`);
    return true;
}

/**
 * Initialize database table if not exists
 */
async function initializeDatabase() {
    // NodeBB uses KVS-style database, no table creation needed
    winston.info('[caiz] API tokens database initialized');
}

module.exports = {
    generateApiToken,
    hashToken,
    verifyToken,
    validateTokenName,
    validatePermissions,
    getUserTokens,
    createToken,
    updateToken,
    deleteToken,
    initializeDatabase
};