'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');
const user = require.main.require('./src/user');
const nconf = require.main.require('nconf');
const JWKSManager = require('./jwks');

/**
 * OAuth 2.0 Token Exchange Management
 */
class OAuthToken {
    constructor() {
        // Refresh tokens storage (production: Redis/DB)
        this.refreshTokens = new Map();
    }

    /**
     * Validate token request parameters
     * @param {Object} params - Request parameters
     * @throws {Error} If validation fails
     */
    validateTokenParams(params) {
        winston.verbose('[mcp-server] Validating token exchange parameters');

        const required = ['grant_type', 'code', 'redirect_uri', 'client_id', 'code_verifier', 'resource'];
        
        for (const param of required) {
            if (!params[param]) {
                throw new Error(`Missing required parameter: ${param}`);
            }
        }
        
        if (params.grant_type !== 'authorization_code') {
            throw new Error('Unsupported grant_type. Only "authorization_code" is supported');
        }

        // Validate code_verifier format (base64url)
        if (!/^[A-Za-z0-9_-]+$/.test(params.code_verifier)) {
            throw new Error('Invalid code_verifier format. Must be base64url encoded');
        }

        // Validate code_verifier length (43-128 characters per RFC 7636)
        if (params.code_verifier.length < 43 || params.code_verifier.length > 128) {
            throw new Error('Invalid code_verifier length. Must be 43-128 characters');
        }

        // Validate resource parameter
        const baseUrl = nconf.get('url');
        if (params.resource !== baseUrl) {
            throw new Error(`Invalid resource parameter. Expected: ${baseUrl}`);
        }
        
        winston.verbose('[mcp-server] Token parameters validation successful');
        return true;
    }

    /**
     * Validate authorization code and PKCE
     * @param {string} code - Authorization code
     * @param {string} codeVerifier - PKCE code verifier
     * @param {string} clientId - OAuth client ID
     * @param {string} redirectUri - Redirect URI
     * @param {string} resource - Resource parameter
     * @param {Object} oauthAuth - OAuthAuth instance for accessing auth codes
     * @returns {Object} Authorization code data
     * @throws {Error} If validation fails
     */
    validateAuthorizationCode(code, codeVerifier, clientId, redirectUri, resource, oauthAuth) {
        winston.verbose('[mcp-server] Validating authorization code and PKCE');

        const authCode = oauthAuth.getAuthCode(code);
        
        if (!authCode) {
            throw new Error('Invalid authorization code');
        }
        
        if (authCode.used) {
            throw new Error('Authorization code already used');
        }
        
        if (Date.now() > authCode.expiresAt) {
            oauthAuth.cleanupExpiredCodes();
            throw new Error('Authorization code expired');
        }
        
        if (authCode.clientId !== clientId) {
            throw new Error('Client ID mismatch');
        }
        
        if (authCode.redirectUri !== redirectUri) {
            throw new Error('Redirect URI mismatch');
        }
        
        if (authCode.resource !== resource) {
            throw new Error('Resource parameter mismatch');
        }
        
        // PKCE verification: S256(code_verifier) must equal code_challenge
        const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
        if (hash !== authCode.codeChallenge) {
            throw new Error('PKCE verification failed');
        }
        
        winston.verbose('[mcp-server] Authorization code and PKCE validation successful');
        return authCode;
    }

    /**
     * Generate access token (JWT)
     * @param {Object} authCode - Authorization code data
     * @param {Object} userData - User data from NodeBB
     * @returns {Object} Access token response
     */
    generateAccessToken(authCode, userData) {
        winston.verbose('[mcp-server] Generating access token for user:', authCode.userId);

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = 3600; // 1 hour
        const baseUrl = nconf.get('url');
        
        const payload = {
            iss: baseUrl,
            aud: baseUrl,
            sub: String(authCode.userId),
            iat: now,
            exp: now + expiresIn,
            scope: authCode.scopes.join(' '),
            preferred_username: userData.username,
            name: userData.displayname || userData.username,
            email: userData.email
        };
        
        const accessToken = JWKSManager.signJWT(payload);
        
        winston.verbose('[mcp-server] Access token generated successfully');
        
        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: expiresIn,
            scope: authCode.scopes.join(' ')
        };
    }

    /**
     * Generate refresh token (optional)
     * @param {Object} authCode - Authorization code data
     * @returns {Object} Refresh token response
     */
    generateRefreshToken(authCode) {
        winston.verbose('[mcp-server] Generating refresh token for user:', authCode.userId);

        const refreshToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        this.refreshTokens.set(refreshToken, {
            userId: authCode.userId,
            clientId: authCode.clientId,
            scopes: authCode.scopes,
            expiresAt
        });
        
        winston.verbose('[mcp-server] Refresh token generated successfully');
        
        return {
            refresh_token: refreshToken,
            refresh_token_expires_in: 86400 // 24 hours
        };
    }

    /**
     * Process token exchange
     * @param {Object} params - Token request parameters
     * @param {Object} oauthAuth - OAuthAuth instance for accessing auth codes
     * @returns {Object} Token response
     * @throws {Error} If exchange fails
     */
    async exchangeCodeForToken(params, oauthAuth) {
        winston.verbose('[mcp-server] Starting token exchange process');

        // 1. Validate parameters
        this.validateTokenParams(params);
        
        // 2. Validate authorization code and PKCE
        const authCode = this.validateAuthorizationCode(
            params.code,
            params.code_verifier,
            params.client_id,
            params.redirect_uri,
            params.resource,
            oauthAuth
        );
        
        // 3. Get user data from NodeBB
        const userData = await user.getUserData(authCode.userId);
        if (!userData) {
            throw new Error('Failed to retrieve user information');
        }
        
        // 4. Mark code as used (one-time use)
        oauthAuth.markAuthCodeAsUsed(params.code);
        
        // 5. Generate tokens
        const accessTokenResponse = this.generateAccessToken(authCode, userData);
        const refreshTokenResponse = this.generateRefreshToken(authCode);
        
        // 6. Clean up expired codes
        oauthAuth.cleanupExpiredCodes();
        
        winston.verbose('[mcp-server] Token exchange completed successfully');
        
        return {
            ...accessTokenResponse,
            ...refreshTokenResponse
        };
    }

    /**
     * Cleanup expired refresh tokens
     */
    cleanupExpiredRefreshTokens() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [token, data] of this.refreshTokens.entries()) {
            if (now > data.expiresAt) {
                this.refreshTokens.delete(token);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            winston.verbose(`[mcp-server] Cleaned up ${cleaned} expired refresh tokens`);
        }
    }

    /**
     * Get refresh token data
     * @param {string} refreshToken - Refresh token
     * @returns {Object|null} Refresh token data
     */
    getRefreshToken(refreshToken) {
        return this.refreshTokens.get(refreshToken);
    }

    /**
     * Revoke refresh token
     * @param {string} refreshToken - Refresh token to revoke
     * @returns {boolean} True if token was found and revoked
     */
    revokeRefreshToken(refreshToken) {
        const existed = this.refreshTokens.has(refreshToken);
        this.refreshTokens.delete(refreshToken);
        
        if (existed) {
            winston.verbose('[mcp-server] Refresh token revoked successfully');
        }
        
        return existed;
    }
}

// Singleton instance
const oauthToken = new OAuthToken();

module.exports = oauthToken;