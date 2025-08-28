'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');
const OAuthToken = require('./oauth-token');

/**
 * Unified OAuth2 Authentication Middleware
 * Supports OAuth2 Device Authorization Grant tokens only
 * API tokens are no longer supported (deprecated)
 */
class OAuthAuthenticator {
    /**
     * Get or create server-side secret for HMAC
     * @returns {string} Server secret
     */
    static getServerSecret() {
        if (!this._serverSecret) {
            // Generate a secure 32-byte secret
            this._serverSecret = crypto.randomBytes(32).toString('hex');
            winston.verbose('[mcp-server] Generated new server secret for token HMAC');
        }
        return this._serverSecret;
    }

    /**
     * Create secure token hint and hash
     * @param {string} token - Full token
     * @returns {Object} {tokenHint, tokenHash}
     */
    static createTokenMetadata(token) {
        if (!token) {
            return { tokenHint: null, tokenHash: null };
        }

        // Create hint (first 8 chars + '...')
        const tokenHint = token.substring(0, 8) + '...';
        
        // Create HMAC-SHA256 hash using server secret
        const secret = this.getServerSecret();
        const tokenHash = crypto
            .createHmac('sha256', secret)
            .update(token)
            .digest('hex');

        return { tokenHint, tokenHash };
    }
    /**
     * Extract Bearer token from Authorization header
     * @param {string} authHeader - Authorization header value
     * @returns {string|null} Extracted token or null
     */
    static extractBearerToken(authHeader) {
        if (!authHeader) {
            return null;
        }

        // Use regex to handle multiple spaces/tabs between Bearer and token
        const match = authHeader.match(/^\s*Bearer\s+([^\s]+)\s*$/i);
        if (!match) {
            return null;
        }
        
        return match[1];
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
     * Escape double quotes for WWW-Authenticate header
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    static escapeHeaderValue(str) {
        return str.replace(/"/g, '\\"');
    }

    /**
     * Send 401 Unauthorized response for invalid tokens (RFC 6750)
     * @param {Object} res - Express response object
     * @param {string} errorDescription - Error description (optional)
     * @returns {void}
     */
    static sendUnauthorized(res, errorDescription) {
        const description = errorDescription || 'Invalid or expired token';
        const escapedDesc = this.escapeHeaderValue(description);
        
        res.status(401).set({
            'WWW-Authenticate': `Bearer realm="MCP API", error="invalid_token", error_description="${escapedDesc}"`,
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
        }).json({
            error: 'invalid_token',
            error_description: description
        });
    }

    /**
     * Send 400 Bad Request for invalid requests (RFC 6750)
     * @param {Object} res - Express response object
     * @param {string} description - Error description
     * @returns {void}
     */
    static sendInvalidRequest(res, description) {
        const escapedDesc = this.escapeHeaderValue(description);
        
        res.status(400).set({
            'WWW-Authenticate': `Bearer realm="MCP API", error="invalid_request", error_description="${escapedDesc}"`,
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
        }).json({
            error: 'invalid_request',
            error_description: description
        });
    }

    /**
     * Send 403 Forbidden for insufficient scope (RFC 6750)
     * @param {Object} res - Express response object
     * @param {Array<string>} requiredScopes - Required scopes
     * @returns {void}
     */
    static sendInsufficientScope(res, requiredScopes) {
        const scopesString = Array.isArray(requiredScopes) ? requiredScopes.join(' ') : requiredScopes;
        
        res.status(403).set({
            'WWW-Authenticate': `Bearer realm="MCP API", error="insufficient_scope", scope="${scopesString}"`,
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
        }).json({
            error: 'insufficient_scope',
            required_scopes: requiredScopes
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
            return OAuthAuthenticator.sendInvalidRequest(res, 'Missing or malformed Authorization header');
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

        // Create secure token metadata (never store full token)
        const { tokenHint, tokenHash } = OAuthAuthenticator.createTokenMetadata(token);
        const now = new Date();
        const expiresAt = new Date(authInfo.expiresAt);
        const expirySeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

        // Set authentication context (no raw token stored)
        req.auth = {
            userId: authInfo.userId,
            type: authInfo.type,
            clientId: authInfo.clientId,
            scopes: authInfo.scopes,
            tokenHint: tokenHint, // Safe partial token for audit
            tokenHash: tokenHash, // HMAC hash for verification
            tokenExpiresAt: expiresAt.toISOString(), // ISO timestamp
            tokenExpirySeconds: expirySeconds, // Seconds until expiry
            authenticatedAt: now.toISOString(), // ISO timestamp when authenticated
            username: userData.username,
            email: userData.email,
            displayname: userData.displayname || userData.username
        };

        // Ensure full token is not kept in memory
        // (token variable will be garbage collected after this scope)

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
                    // Create secure token metadata (never store full token)
                    const { tokenHint, tokenHash } = OAuthAuthenticator.createTokenMetadata(token);
                    const now = new Date();
                    const expiresAt = new Date(authInfo.expiresAt);
                    const expirySeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

                    req.auth = {
                        userId: authInfo.userId,
                        type: authInfo.type,
                        clientId: authInfo.clientId,
                        scopes: authInfo.scopes,
                        tokenHint: tokenHint, // Safe partial token for audit
                        tokenHash: tokenHash, // HMAC hash for verification
                        tokenExpiresAt: expiresAt.toISOString(), // ISO timestamp
                        tokenExpirySeconds: expirySeconds, // Seconds until expiry
                        authenticatedAt: now.toISOString(), // ISO timestamp when authenticated
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