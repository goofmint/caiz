'use strict';

const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');

/**
 * Simple Bearer Token Authentication for MCP
 * No OAuth2 complexity - just static token verification
 */
class SimpleAuth {
    /**
     * Get configured MCP API token
     * @returns {string|null} Configured API token
     */
    static getMCPToken() {
        // Get from NodeBB settings
        return meta.config['mcp-server-token'] || null;
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

        const match = authHeader.match(/^Bearer\s+(.+)$/);
        return match ? match[1] : null;
    }

    /**
     * Validate Bearer token
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid
     */
    static validateToken(token) {
        if (!token) {
            return false;
        }

        const configuredToken = this.getMCPToken();
        if (!configuredToken) {
            winston.warn('[mcp-server] No MCP token configured');
            return false;
        }

        return token === configuredToken;
    }

    /**
     * Create authentication middleware
     * @returns {Function} Express middleware
     */
    static requireAuth() {
        return (req, res, next) => {
            winston.verbose('[mcp-server] Simple auth middleware executing');

            const token = this.extractBearerToken(req);
            
            if (!token) {
                winston.verbose('[mcp-server] No Bearer token provided');
                return res.status(401).json({
                    error: 'invalid_token',
                    error_description: 'Bearer token required for MCP access'
                });
            }

            if (!this.validateToken(token)) {
                winston.verbose('[mcp-server] Invalid Bearer token');
                return res.status(401).json({
                    error: 'invalid_token',
                    error_description: 'Invalid Bearer token'
                });
            }

            // Set simple auth context
            req.auth = {
                authenticated: true,
                type: 'bearer',
                scopes: ['mcp:read', 'mcp:write']
            };

            winston.verbose('[mcp-server] Authentication successful');
            next();
        };
    }

    /**
     * Optional authentication middleware
     * @returns {Function} Express middleware
     */
    static optionalAuth() {
        return (req, res, next) => {
            const token = this.extractBearerToken(req);
            
            if (token && this.validateToken(token)) {
                req.auth = {
                    authenticated: true,
                    type: 'bearer',
                    scopes: ['mcp:read', 'mcp:write']
                };
                winston.verbose('[mcp-server] Optional authentication successful');
            } else {
                winston.verbose('[mcp-server] Optional authentication skipped');
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