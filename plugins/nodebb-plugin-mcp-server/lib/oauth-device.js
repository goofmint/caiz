'use strict';

const crypto = require('crypto');
const db = require.main.require('./src/database');
const winston = require.main.require('winston');
const nconf = require.main.require('nconf');

// Device Authorization設定
const deviceAuthConfig = {
    userCodeLength: 8,
    userCodeCharset: 'BCDFGHJKMNPQRSTVWXYZ23456789',
    deviceCodeLength: 43,
    codeExpiry: 600, // 10分
    pollingInterval: 5, // 5秒
    maxPollingAttempts: 120, // 最大10分間のポーリング
    maxRetries: 10 // コード生成時の最大リトライ回数
};

class DeviceAuthManager {
    /**
     * Generate device code
     * @returns {string} device_code - URL-safe random string
     */
    static generateDeviceCode() {
        // 32 bytes -> base64url (no padding) => 43 characters
        const bytes = crypto.randomBytes(32);
        return bytes
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * Generate user code  
     * @returns {string} user_code - Human-readable code
     */
    static generateUserCode() {
        // Exclude ambiguous chars: I, L, O, 0, 1
        const charset = 'BCDFGHJKMNPQRSTVWXYZ23456789';
        const pick = n => Array.from(crypto.randomBytes(n), b => charset[b % charset.length]);

        const a = pick(4).join('');
        const b = pick(4).join('');
        return `${a}-${b}`;
    }

    /**
     * Generate unique codes with collision retry using atomic claims
     * @returns {Object} {deviceCode, userCode}
     */
    static async generateUniqueCodes() {
        for (let attempt = 0; attempt < deviceAuthConfig.maxRetries; attempt++) {
            const deviceCode = this.generateDeviceCode();
            const userCode = this.generateUserCode();

            const deviceKey = `oauth:device:${deviceCode}`;
            const userCodeKey = `oauth:user_code:${userCode}`;
            const ttl = deviceAuthConfig.codeExpiry;

            try {
                // Atomic claim using SET NX EX for both keys
                const deviceClaimResult = await db.client.set(deviceKey, 'claimed', 'NX', 'EX', ttl);
                const userCodeClaimResult = await db.client.set(userCodeKey, 'claimed', 'NX', 'EX', ttl);

                // Check if both claims succeeded
                if (deviceClaimResult === 'OK' && userCodeClaimResult === 'OK') {
                    // Success - clean up the claim markers
                    await db.client.del(deviceKey, userCodeKey);
                    return { deviceCode, userCode };
                }

                // Clean up any successful claims on collision
                if (deviceClaimResult === 'OK') {
                    await db.client.del(deviceKey);
                }
                if (userCodeClaimResult === 'OK') {
                    await db.client.del(userCodeKey);
                }

                winston.warn(`[mcp-server] Code collision detected, retry ${attempt + 1}/${deviceAuthConfig.maxRetries}`);
            } catch (err) {
                winston.error(`[mcp-server] Error during code claim: ${err.message}`);
            }
        }

        throw new Error('Failed to generate unique codes after maximum retries');
    }

    /**
     * Store device authorization request
     * @param {Object} authRequest - Authorization request data
     */
    static async storeAuthRequest(authRequest) {
        // TTL in seconds as provided by authRequest.expires_in
        const ttl = authRequest.expires_in;
        const deviceKey = `oauth:device:${authRequest.device_code}`;
        const userCodeKey = `oauth:user_code:${authRequest.user_code}`;

        try {
            winston.verbose(`[mcp-server] Storing auth request: ${deviceKey}`);

            // Use Redis MULTI for atomic operation
            const multi = db.client.multi();
            
            // Store primary data with TTL
            multi.setex(deviceKey, ttl, JSON.stringify(authRequest));
            // Store reverse lookup with same TTL
            multi.setex(userCodeKey, ttl, authRequest.device_code);
            
            const results = await multi.exec();
            
            // Check if both operations succeeded
            if (!results || results.length !== 2 || results.some(([err]) => err)) {
                throw new Error('Failed to store device authorization request atomically');
            }

            winston.verbose(`[mcp-server] Auth request stored successfully: ${deviceKey}`);
        } catch (err) {
            winston.error(`[mcp-server] Failed to store auth request: ${err.message}`);
            throw err;
        }
    }

    /**
     * Retrieve authorization request by device code
     * @param {string} deviceCode
     * @returns {Object|null} Authorization request or null
     */
    static async getAuthRequestByDeviceCode(deviceCode) {
        try {
            const deviceKey = `oauth:device:${deviceCode}`;
            const data = await db.client.get(deviceKey);
            
            if (!data) {
                return null;
            }

            return JSON.parse(data);
        } catch (err) {
            winston.error(`[mcp-server] Failed to retrieve auth request by device code: ${err.message}`);
            return null;
        }
    }

    /**
     * Retrieve authorization request by user code
     * @param {string} userCode  
     * @returns {Object|null} Authorization request or null
     */
    static async getAuthRequestByUserCode(userCode) {
        try {
            const userCodeKey = `oauth:user_code:${userCode}`;
            const deviceCode = await db.client.get(userCodeKey);
            
            if (!deviceCode) {
                return null;
            }

            // Get the full auth request
            return await this.getAuthRequestByDeviceCode(deviceCode);
        } catch (err) {
            winston.error(`[mcp-server] Failed to retrieve auth request by user code: ${err.message}`);
            return null;
        }
    }

    /**
     * Update authorization status
     * @param {string} deviceCode
     * @param {string} status - 'pending', 'approved', 'denied'
     * @param {number} userId - User ID if approved
     */
    static async updateAuthStatus(deviceCode, status, userId = null) {
        try {
            const deviceKey = `oauth:device:${deviceCode}`;
            
            // Get current data
            const authRequest = await this.getAuthRequestByDeviceCode(deviceCode);
            if (!authRequest) {
                throw new Error('Device code not found or expired');
            }

            // Update status and user_id
            authRequest.status = status;
            if (userId !== null) {
                authRequest.user_id = userId;
            }

            // Get remaining TTL to preserve expiration
            const ttl = await db.client.ttl(deviceKey);
            if (ttl <= 0) {
                throw new Error('Device code has expired');
            }

            // Update with preserved TTL
            await db.client.setex(deviceKey, ttl, JSON.stringify(authRequest));
            
            winston.verbose(`[mcp-server] Auth status updated: ${deviceCode} -> ${status}`);
        } catch (err) {
            winston.error(`[mcp-server] Failed to update auth status: ${err.message}`);
            throw err;
        }
    }

    /**
     * Create device authorization response
     * @param {string} deviceCode
     * @param {string} userCode
     * @param {string} clientId
     * @param {string} scope
     * @returns {Object} Device authorization response
     */
    static createAuthorizationRequest(deviceCode, userCode, clientId, scope) {
        const baseUrl = nconf.get('url').replace(/\/$/, '');
        const expiresIn = deviceAuthConfig.codeExpiry;
        const interval = deviceAuthConfig.pollingInterval;
        
        return {
            device_code: deviceCode,
            user_code: userCode,
            client_id: clientId,
            scope: scope,
            status: 'pending',
            created_at: Date.now(),
            expires_at: Date.now() + (expiresIn * 1000),
            expires_in: expiresIn,
            verification_uri: `${baseUrl}/oauth/device`,
            verification_uri_complete: `${baseUrl}/oauth/device?user_code=${userCode}`,
            interval: interval
        };
    }

    /**
     * Validate client and scope
     * @param {string} clientId
     * @param {string} scope
     * @returns {Object} {valid: boolean, error?: string, error_description?: string}
     */
    static validateClientAndScope(clientId, scope) {
        // Validate client_id
        const validClientId = 'caiz-mcp-server';
        if (!clientId || clientId !== validClientId) {
            return {
                valid: false,
                error: 'invalid_client',
                error_description: 'Client authentication failed'
            };
        }

        // Validate scope
        const supportedScopes = ['openid', 'mcp:read', 'mcp:search', 'mcp:write'];
        const requestedScopes = scope ? scope.split(/[\s+]/) : [];
        
        for (const requestedScope of requestedScopes) {
            if (!supportedScopes.includes(requestedScope)) {
                return {
                    valid: false,
                    error: 'invalid_scope',
                    error_description: 'The requested scope is invalid or unknown'
                };
            }
        }

        return { valid: true };
    }

    /**
     * Get configuration
     * @returns {Object} Device auth configuration
     */
    static getConfig() {
        return { ...deviceAuthConfig };
    }
}

module.exports = DeviceAuthManager;