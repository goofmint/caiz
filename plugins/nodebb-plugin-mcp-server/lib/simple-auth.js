'use strict';

const winston = require.main.require('winston');

/**
 * Legacy Authentication Module
 * Provides compatibility layer for OAuth2 migration
 * All authentication now delegated to unified-auth.js
 */
class SimpleAuth {

    /**
     * Legacy API token validation - 完全廃止
     * @deprecated OAuth2認証への移行により廃止
     * @param {string} apiToken - API token (no longer supported)
     * @returns {Promise<never>} Always throws error
     */
    static async validateAPIToken(apiToken) {
        // Deprecated path – fail fast and surface telemetry
        if (process.emitWarning) {
            process.emitWarning('SimpleAuth.validateAPIToken is removed. Migrate to unified-auth.', {
                code: 'MCP_DEPRECATED_AUTH',
                detail: 'This call will throw from next release.',
            });
        }
        const err = new Error('Legacy API token auth is removed');
        err.code = 'E_AUTH_REMOVED';
        throw err;
    }

    /**
     * Legacy validateApiToken alias for backward compatibility
     * @deprecated Use validateAPIToken (capitalized) or migrate to OAuth2
     * @param {string} token - API token (no longer supported)
     * @returns {Promise<never>} Always throws error
     */
    static async validateApiToken(token) {
        return this.validateAPIToken(token);
    }

    /**
     * Legacy validateToken method
     * @deprecated Migrate to OAuth2 authentication
     * @param {string} token - Token to validate
     * @returns {Promise<never>} Always throws error
     */
    static async validateToken(token) {
        return this.validateAPIToken(token);
    }

    /**
     * Unified authentication middleware - OAuth2専用
     * OAuthAuthenticatorへの移行
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     * @returns {Promise<void>}
     */
    static async authenticate(req, res, next) {
        const OAuthAuthenticator = require('./unified-auth');
        return OAuthAuthenticator.authenticate(req, res, next);
    }

    /**
     * Optional authentication middleware - OAuth2専用
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     * @returns {Promise<void>}
     */
    static async optionalAuth(req, res, next) {
        const OAuthAuthenticator = require('./unified-auth');
        return OAuthAuthenticator.optionalAuth(req, res, next);
    }

    /**
     * Legacy requireAuth method that returns middleware function
     * @deprecated Use authenticate method directly
     * @returns {Function} Express middleware
     */
    static requireAuth() {
        return this.authenticate;
    }

    /**
     * Legacy method that returns optional auth middleware function
     * @deprecated Use optionalAuth method directly
     * @returns {Function} Express middleware
     */
    static optionalAuthMiddleware() {
        return this.optionalAuth;
    }

    /**
     * Extract Bearer token from Authorization header
     * @param {Object} req - Express request object
     * @returns {string|null} Bearer token or null
     */
    static extractBearerToken(req) {
        const OAuthAuthenticator = require('./unified-auth');
        return OAuthAuthenticator.extractBearerToken(req.get('Authorization'));
    }

    /**
     * Generate a random token for configuration purposes
     * @deprecated API tokens are no longer used
     * @returns {string} Random token
     */
    static generateToken() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = SimpleAuth;