'use strict';

const winston = require.main.require('winston');
const OAuthToken = require('./oauth-token');

/**
 * Unified OAuth2 Authentication Middleware
 * Supports OAuth2 Device Authorization Grant tokens only
 * API tokens are no longer supported (deprecated)
 */
class OAuthAuthenticator {
    /**
     * Extract Bearer token from Authorization header
     * @param {string} authHeader - Authorization header value
     * @returns {string|null} Extracted token or null
     */
    static extractBearerToken(authHeader) {
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
     * Validate OAuth2 access token
     * @param {string} accessToken - OAuth2 access token
     * @returns {Promise<Object>} Authentication info { userId, clientId, scopes, type: 'oauth2' }
     */
    static async validateOAuth2Token(accessToken) {
        try {
            winston.verbose('[mcp-server] Validating OAuth2 access token');
            
            // Validate token through OAuth Token module
            const tokenData = await OAuthToken.validateDeviceAccessToken(accessToken);
            
            winston.verbose('[mcp-server] OAuth2 token validated successfully', {
                userId: tokenData.userId,
                clientId: tokenData.clientId,
                scopes: tokenData.scopes
            });
            
            return {
                userId: tokenData.userId,
                clientId: tokenData.clientId,
                scopes: tokenData.scopes || [],
                type: 'oauth2',
                expiresAt: tokenData.expiresAt,
                createdAt: tokenData.createdAt
            };
        } catch (err) {
            winston.verbose('[mcp-server] OAuth2 token validation failed:', err.message);
            return null;
        }
    }

    /**
     * Legacy API token validation - always returns null (deprecated)
     * @param {string} apiToken - API token (no longer supported)
     * @returns {Promise<null>} Always returns null
     */
    static async validateAPIToken(apiToken) {
        winston.verbose('[mcp-server] API token validation attempted but no longer supported');
        return null;
    }

    /**
     * Send 401 Unauthorized response
     * @param {Object} res - Express response object
     * @param {string} errorDescription - Error description (optional)
     * @returns {void}
     */
    static sendUnauthorized(res, errorDescription) {
        const description = errorDescription || 'Invalid or expired token';
        
        res.status(401).set({
            'WWW-Authenticate': `Bearer realm="MCP API", error="invalid_token", error_description="${description}"`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
        }).json({
            error: 'unauthorized',
            error_description: description
        });
    }

    /**
     * Unified authentication middleware
     * Supports OAuth2 tokens only
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     * @returns {Promise<void>}
     */
    static async authenticate(req, res, next) {
        winston.verbose('[mcp-server] OAuth authentication middleware executing');
        winston.verbose('[mcp-server] Authorization header present:', !!req.headers.authorization);

        // Extract Bearer token
        const token = OAuthAuthenticator.extractBearerToken(req.get('Authorization'));
        
        if (!token) {
            winston.verbose('[mcp-server] No Bearer token provided');
            return OAuthAuthenticator.sendUnauthorized(res, 'Missing or invalid Authorization header');
        }

        // Determine token type and validate
        let authInfo = null;

        // Always try OAuth2 validation (API tokens no longer supported)
        authInfo = await OAuthAuthenticator.validateOAuth2Token(token);

        if (!authInfo) {
            winston.verbose('[mcp-server] Token validation failed');
            return OAuthAuthenticator.sendUnauthorized(res, 'The access token provided is invalid or expired');
        }

        // Get user information
        const User = require.main.require('./src/user');
        const userData = await User.getUserData(authInfo.userId);
        
        if (!userData) {
            winston.warn('[mcp-server] User not found for authenticated token:', authInfo.userId);
            return OAuthAuthenticator.sendUnauthorized(res, 'User account not found');
        }

        // Set authentication context
        req.auth = {
            userId: authInfo.userId,
            type: authInfo.type,
            clientId: authInfo.clientId,
            scopes: authInfo.scopes,
            token: token.substring(0, 8) + '...', // Store partial token for audit
            authenticatedAt: Date.now(),
            username: userData.username,
            email: userData.email,
            displayname: userData.displayname || userData.username
        };

        winston.verbose('[mcp-server] Authentication successful', {
            userId: authInfo.userId,
            type: authInfo.type,
            clientId: authInfo.clientId
        });

        next();
    }

    /**
     * Optional authentication middleware
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object  
     * @param {Function} next - Express next function
     * @returns {Promise<void>}
     */
    static async optionalAuth(req, res, next) {
        winston.verbose('[mcp-server] Optional OAuth authentication middleware executing');
        
        const token = OAuthAuthenticator.extractBearerToken(req.get('Authorization'));
        
        if (token) {
            // Try OAuth2 validation
            const authInfo = await OAuthAuthenticator.validateOAuth2Token(token);
            
            if (authInfo) {
                // Get user information
                const User = require.main.require('./src/user');
                const userData = await User.getUserData(authInfo.userId);
                
                if (userData) {
                    req.auth = {
                        userId: authInfo.userId,
                        type: authInfo.type,
                        clientId: authInfo.clientId,
                        scopes: authInfo.scopes,
                        token: token.substring(0, 8) + '...',
                        authenticatedAt: Date.now(),
                        username: userData.username,
                        email: userData.email,
                        displayname: userData.displayname || userData.username
                    };
                    
                    winston.verbose('[mcp-server] Optional authentication successful', {
                        userId: authInfo.userId,
                        type: authInfo.type
                    });
                } else {
                    winston.verbose('[mcp-server] Optional authentication failed - user not found');
                }
            } else {
                winston.verbose('[mcp-server] Optional authentication failed - invalid token');
            }
        } else {
            winston.verbose('[mcp-server] Optional authentication skipped - no token');
        }

        next();
    }
}

module.exports = OAuthAuthenticator;