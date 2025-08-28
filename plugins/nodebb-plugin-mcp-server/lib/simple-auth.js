'use strict';

const winston = require.main.require('winston');
const OAuthAuthenticator = require('./unified-auth');

/**
 * Bearer Token Authentication for MCP
 * Now uses OAuth2 authentication exclusively
 * API tokens are no longer supported
 */
class SimpleAuth {

    /**
     * Extract Bearer token from request (delegates to OAuthAuthenticator)
     * @param {Object} req - Express request
     * @returns {string|null} Bearer token or null
     */
    static extractBearerToken(req) {
        return OAuthAuthenticator.extractBearerToken(req.get('Authorization'));
    }

    /**
     * Validate Bearer token (no longer supports API tokens)
     * @param {string} token - Token to validate
     * @returns {Promise<Object|null>} User info if valid, null if invalid
     */
    static async validateApiToken(token) {
        // API tokens are no longer supported
        winston.verbose('[mcp-server] validateApiToken called but API tokens are no longer supported');
        return null;
    }


    /**
     * Legacy method for backward compatibility - no longer supports API tokens
     * @param {string} token - Token to validate
     * @returns {Promise<boolean>} Always returns false
     */
    static async validateToken(token) {
        // API tokens are no longer supported
        return false;
    }

    /**
     * Create authentication middleware using OAuth2 tokens
     * @returns {Function} Express middleware
     */
    static requireAuth() {
        return OAuthAuthenticator.authenticate;
    }

    /**
     * Optional authentication middleware using OAuth2 tokens
     * @returns {Function} Express middleware
     */
    static optionalAuth() {
        return OAuthAuthenticator.optionalAuth;
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