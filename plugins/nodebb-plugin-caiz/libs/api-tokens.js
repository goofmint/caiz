'use strict';

const crypto = require('crypto');
const db = require.main.require('./src/database');
const winston = require.main.require('winston');
const { v7: uuidv7 } = require('uuid');

const API_TOKEN_PEPPER = process.env.CAIZ_API_TOKEN_PEPPER || crypto.randomBytes(32).toString('hex');
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
 * Hash token using HMAC-SHA-256 with server-side pepper
 * @param {string} token - The token to hash
 * @returns {string} Hexadecimal hash
 */
function hashToken(token) {
    const hmac = crypto.createHmac('sha256', API_TOKEN_PEPPER);
    return hmac.update(token).digest('hex');
}

/**
 * Verify token against stored hash using timing-safe comparison
 * @param {string} token - The token to verify
 * @param {string} storedHash - The stored hash
 * @returns {boolean} True if token is valid
 */
function verifyToken(token, storedHash) {
    const expected = crypto
        .createHmac('sha256', API_TOKEN_PEPPER)
        .update(token)
        .digest('hex');
    
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
    
    const query = `
        SELECT token_id, name, token_prefix, permissions, is_active, 
               created_at, updated_at, last_used_at, expires_at
        FROM api_tokens 
        WHERE uid = ? AND revoked_at IS NULL
        ORDER BY created_at DESC
    `;
    
    const tokens = await db.query(query, [uid]);
    
    return tokens.map(token => ({
        id: token.token_id,
        name: token.name,
        prefix: token.token_prefix,
        permissions: JSON.parse(token.permissions || '[]'),
        isActive: Boolean(token.is_active),
        createdAt: token.created_at,
        updatedAt: token.updated_at,
        lastUsedAt: token.last_used_at,
        expiresAt: token.expires_at
    }));
}

/**
 * Check if token name is unique for user
 * @param {number} uid - User ID
 * @param {string} name - Token name
 * @param {string} excludeTokenId - Token ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if name is unique
 */
async function isTokenNameUnique(uid, name, excludeTokenId = null) {
    const query = excludeTokenId
        ? 'SELECT COUNT(*) as count FROM api_tokens WHERE uid = ? AND LOWER(name) = LOWER(?) AND token_id != ? AND revoked_at IS NULL'
        : 'SELECT COUNT(*) as count FROM api_tokens WHERE uid = ? AND LOWER(name) = LOWER(?) AND revoked_at IS NULL';
    
    const params = excludeTokenId ? [uid, name, excludeTokenId] : [uid, name];
    const result = await db.query(query, params);
    
    return result[0].count === 0;
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
    
    // Insert into database with retry on hash collision
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
        try {
            const query = `
                INSERT INTO api_tokens (
                    token_id, uid, name, token_prefix, token_hash, 
                    permissions, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await db.query(query, [
                tokenId, uid, name, prefix, tokenHash,
                JSON.stringify(permissions), true, now, now
            ]);
            
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
            
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY' && error.message.includes('token_hash')) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    winston.error(`[caiz] Failed to create unique token hash after ${maxRetries} attempts`);
                    throw new Error('[[caiz:error.token-generation-failed]]');
                }
                // Generate new token and retry
                const newTokenData = generateApiToken();
                token = newTokenData.token;
                tokenId = newTokenData.tokenId;
                prefix = newTokenData.prefix;
                tokenHash = hashToken(token);
            } else {
                throw error;
            }
        }
    }
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
    const existing = await db.queryOne(
        'SELECT * FROM api_tokens WHERE token_id = ? AND uid = ? AND revoked_at IS NULL',
        [tokenId, uid]
    );
    
    if (!existing) {
        throw new Error('[[caiz:error.token-not-found]]');
    }
    
    const updates = {};
    const updateFields = [];
    const updateValues = [];
    
    // Validate and prepare updates
    if (data.name !== undefined) {
        const name = validateTokenName(data.name);
        const isUnique = await isTokenNameUnique(uid, name, tokenId);
        if (!isUnique) {
            throw new Error('[[caiz:error.token-name-exists]]');
        }
        updates.name = name;
        updateFields.push('name = ?');
        updateValues.push(name);
    }
    
    if (data.isActive !== undefined) {
        updates.isActive = Boolean(data.isActive);
        updateFields.push('is_active = ?');
        updateValues.push(updates.isActive);
    }
    
    if (data.permissions !== undefined) {
        const permissions = validatePermissions(data.permissions);
        updates.permissions = permissions;
        updateFields.push('permissions = ?');
        updateValues.push(JSON.stringify(permissions));
    }
    
    if (data.expiresAt !== undefined) {
        if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
            throw new Error('[[caiz:error.invalid-expiry-date]]');
        }
        updates.expiresAt = data.expiresAt;
        updateFields.push('expires_at = ?');
        updateValues.push(data.expiresAt);
    }
    
    if (updateFields.length === 0) {
        throw new Error('[[error:no-changes]]');
    }
    
    // Add updated_at
    const now = Date.now();
    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(tokenId);
    
    const query = `UPDATE api_tokens SET ${updateFields.join(', ')} WHERE token_id = ?`;
    await db.query(query, updateValues);
    
    winston.info(`[caiz] API token updated: ${tokenId} by user ${uid}`);
    
    // Return updated token metadata
    const updated = await db.queryOne(
        `SELECT token_id, name, token_prefix, permissions, is_active, 
                created_at, updated_at, last_used_at, expires_at
         FROM api_tokens WHERE token_id = ?`,
        [tokenId]
    );
    
    return {
        id: updated.token_id,
        name: updated.name,
        prefix: updated.token_prefix,
        permissions: JSON.parse(updated.permissions || '[]'),
        isActive: Boolean(updated.is_active),
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        lastUsedAt: updated.last_used_at,
        expiresAt: updated.expires_at
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
    const existing = await db.queryOne(
        'SELECT token_id FROM api_tokens WHERE token_id = ? AND uid = ? AND revoked_at IS NULL',
        [tokenId, uid]
    );
    
    if (!existing) {
        throw new Error('[[caiz:error.token-not-found]]');
    }
    
    // Soft delete by setting revoked_at
    const now = Date.now();
    await db.query(
        'UPDATE api_tokens SET revoked_at = ?, updated_at = ? WHERE token_id = ?',
        [now, now, tokenId]
    );
    
    winston.info(`[caiz] API token deleted: ${tokenId} by user ${uid}`);
    return true;
}

/**
 * Initialize database table if not exists
 */
async function initializeDatabase() {
    const tableExists = await db.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'api_tokens'
    `);
    
    if (tableExists[0].count === 0) {
        winston.info('[caiz] Creating api_tokens table');
        
        await db.query(`
            CREATE TABLE api_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token_id VARCHAR(36) NOT NULL UNIQUE,
                uid INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                token_prefix CHAR(8) NOT NULL,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                permissions JSON NOT NULL DEFAULT ('[]'),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                last_used_at BIGINT NULL,
                expires_at BIGINT NULL,
                revoked_at BIGINT NULL,
                
                INDEX idx_uid (uid),
                INDEX idx_uid_prefix (uid, token_prefix),
                UNIQUE KEY unique_user_name (uid, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        winston.info('[caiz] api_tokens table created successfully');
    }
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