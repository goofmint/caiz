'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');

/**
 * OAuth2 Client Registry Management
 * Handles client authentication and authorization
 */
class OAuthClients {
    /**
     * Load client configuration from NodeBB settings
     * @returns {Promise<Object>} Client configuration
     */
    static async loadClientConfig() {
        try {
            // Load OAuth client settings from NodeBB meta
            const clientConfig = await meta.settings.get('mcp-server-oauth');
            
            if (!clientConfig || !clientConfig.clients) {
                // Return default client configuration if not set
                return {
                    'mcp-client': {
                        id: 'mcp-client',
                        secret_hash: 'default_hash_placeholder', // In production: actual bcrypt/argon2 hash
                        name: 'MCP Server Client',
                        allowed_grants: ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
                        allowed_scopes: ['mcp:read', 'mcp:write', 'mcp:admin'],
                        introspection_allowed: true
                    }
                };
            }
            
            return JSON.parse(clientConfig.clients);
        } catch (err) {
            winston.error('[oauth-clients] Failed to load client configuration:', err);
            // Return empty config on error - will cause authentication to fail
            return {};
        }
    }
    
    /**
     * Get client information by client ID
     * @param {string} clientId - Client identifier
     * @returns {Promise<Object|null>} Client info or null if not found
     */
    static async getClient(clientId) {
        if (!clientId) {
            return null;
        }
        
        const clientConfig = await this.loadClientConfig();
        return clientConfig[clientId] || null;
    }
    
    /**
     * Authenticate client using client_id and client_secret
     * @param {string} clientId - Client identifier
     * @param {string} clientSecret - Client secret (plain text)
     * @returns {Promise<Object|null>} Client info if authenticated, null if failed
     */
    static async authenticateClient(clientId, clientSecret) {
        if (!clientId || !clientSecret) {
            winston.verbose('[oauth-clients] Missing client credentials');
            return null;
        }
        
        const client = await this.getClient(clientId);
        if (!client) {
            winston.verbose('[oauth-clients] Client not found', { client_id: clientId });
            return null;
        }
        
        // Verify client secret using constant-time comparison
        const isValidSecret = await this.verifyClientSecret(clientSecret, client.secret_hash);
        if (!isValidSecret) {
            winston.warn('[oauth-clients] Client secret verification failed', { 
                client_id: clientId 
            });
            return null;
        }
        
        winston.verbose('[oauth-clients] Client authenticated successfully', { 
            client_id: clientId,
            client_name: client.name
        });
        
        return client;
    }
    
    /**
     * Verify client secret against stored hash using constant-time comparison
     * @param {string} providedSecret - Plain text secret
     * @param {string} storedHash - Stored hash (bcrypt/argon2/scrypt)
     * @returns {Promise<boolean>} True if secret matches
     */
    static async verifyClientSecret(providedSecret, storedHash) {
        try {
            // For now, use a simple SHA-256 comparison for development
            // In production: use bcrypt.compare(), argon2.verify(), or scrypt
            const providedHash = crypto
                .createHash('sha256')
                .update(providedSecret)
                .digest('hex');
            
            // Constant-time comparison to prevent timing attacks
            return crypto.timingSafeEqual(
                Buffer.from(storedHash, 'hex'),
                Buffer.from(providedHash, 'hex')
            );
        } catch (err) {
            winston.error('[oauth-clients] Secret verification error:', err);
            return false;
        }
    }
    
    /**
     * Check if client is authorized to introspect tokens
     * @param {Object} client - Client object
     * @returns {boolean} True if authorized
     */
    static isIntrospectionAllowed(client) {
        return client && client.introspection_allowed === true;
    }
    
    /**
     * Check if client is authorized for specific token
     * @param {Object} client - Authenticated client
     * @param {Object} tokenData - Token data from storage
     * @returns {boolean} True if authorized
     */
    static isClientAuthorizedForToken(client, tokenData) {
        if (!client || !tokenData) {
            return false;
        }
        
        // Check if the client is the same as the token's client
        if (client.id === tokenData.clientId) {
            return true;
        }
        
        // Check if client has admin introspection rights (optional)
        if (client.introspection_scope === 'admin') {
            return true;
        }
        
        // Check allowed audiences if configured (multi-tenant scenarios)
        if (client.allowed_audiences && client.allowed_audiences.includes(tokenData.clientId)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Parse Basic Authentication header
     * @param {string} authHeader - Authorization header value
     * @returns {Object|null} {clientId, clientSecret} or null if invalid
     */
    static parseBasicAuth(authHeader) {
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return null;
        }
        
        try {
            const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
            const colonIndex = credentials.indexOf(':');
            
            if (colonIndex === -1) {
                return null;
            }
            
            const clientId = credentials.substring(0, colonIndex);
            const clientSecret = credentials.substring(colonIndex + 1);
            
            if (!clientId || !clientSecret) {
                return null;
            }
            
            return { clientId, clientSecret };
        } catch (err) {
            winston.verbose('[oauth-clients] Failed to parse Basic auth header:', err.message);
            return null;
        }
    }
    
    /**
     * Generate secure client secret hash (development helper)
     * @param {string} plainSecret - Plain text secret
     * @returns {string} SHA-256 hash (in production: use bcrypt/argon2)
     */
    static hashClientSecret(plainSecret) {
        return crypto
            .createHash('sha256')
            .update(plainSecret)
            .digest('hex');
    }
}

module.exports = OAuthClients;