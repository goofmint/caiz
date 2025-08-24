'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');
const nconf = require.main.require('nconf');

/**
 * OAuth 2.0 Authorization Flow Management
 */
class OAuthAuth {
    constructor() {
        // Authorization codes storage (production: Redis/DB)
        this.authCodes = new Map();
    }

    /**
     * Validate OAuth authorization parameters
     * @param {Object} params - Request parameters
     * @throws {Error} If validation fails
     */
    validateAuthParams(params) {
        winston.verbose('[mcp-server] Validating OAuth authorization parameters');

        // Check required parameters
        const required = ['response_type', 'client_id', 'redirect_uri', 'scope', 'code_challenge', 'code_challenge_method', 'resource'];
        for (const param of required) {
            if (!params[param]) {
                throw new Error(`Missing required parameter: ${param}`);
            }
        }

        // Validate response_type
        if (params.response_type !== 'code') {
            throw new Error('Invalid response_type. Only "code" is supported');
        }

        // Validate code_challenge_method
        if (params.code_challenge_method !== 'S256') {
            throw new Error('Invalid code_challenge_method. Only "S256" is supported');
        }

        // Validate code_challenge (43-128 characters, base64url)
        if (params.code_challenge.length < 43 || params.code_challenge.length > 128) {
            throw new Error('Invalid code_challenge length. Must be 43-128 characters');
        }
        if (!/^[A-Za-z0-9_-]+$/.test(params.code_challenge)) {
            throw new Error('Invalid code_challenge format. Must be base64url encoded');
        }

        // Validate redirect_uri (must be loopback)
        if (!params.redirect_uri.startsWith('http://127.0.0.1:') && !params.redirect_uri.startsWith('http://localhost:')) {
            throw new Error('Invalid redirect_uri. Only loopback addresses are allowed');
        }

        // Validate resource (must match this server)
        const baseUrl = nconf.get('url');
        if (params.resource !== baseUrl) {
            throw new Error(`Invalid resource parameter. Expected: ${baseUrl}`);
        }

        // Validate scope
        const validScopes = ['mcp:read', 'mcp:write', 'mcp:admin'];
        const requestedScopes = params.scope.split(' ');
        for (const scope of requestedScopes) {
            if (!validScopes.includes(scope)) {
                throw new Error(`Invalid scope: ${scope}`);
            }
        }

        winston.verbose('[mcp-server] OAuth parameters validation successful');
        return true;
    }

    /**
     * Generate authorization code
     * @param {number} userId - NodeBB user ID
     * @param {string} clientId - OAuth client ID
     * @param {Array<string>} scopes - Requested scopes
     * @param {string} codeChallenge - PKCE code challenge
     * @param {string} redirectUri - Redirect URI
     * @param {string} resource - Resource parameter
     * @param {string} state - State parameter
     * @returns {string} Authorization code
     */
    generateAuthCode(userId, clientId, scopes, codeChallenge, redirectUri, resource, state) {
        winston.verbose('[mcp-server] Generating authorization code for user:', userId);

        const authCode = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

        this.authCodes.set(authCode, {
            userId,
            clientId,
            scopes,
            codeChallenge,
            redirectUri,
            resource,
            state,
            used: false,
            createdAt: Date.now(),
            expiresAt
        });

        winston.verbose('[mcp-server] Authorization code generated successfully');
        return authCode;
    }

    /**
     * Get authorization code data
     * @param {string} code - Authorization code
     * @returns {Object|null} Authorization code data
     */
    getAuthCode(code) {
        return this.authCodes.get(code);
    }

    /**
     * Mark authorization code as used
     * @param {string} code - Authorization code
     */
    markAuthCodeAsUsed(code) {
        const authCode = this.authCodes.get(code);
        if (authCode) {
            authCode.used = true;
        }
    }

    /**
     * Clean up expired authorization codes
     */
    cleanupExpiredCodes() {
        const now = Date.now();
        for (const [code, data] of this.authCodes.entries()) {
            if (now > data.expiresAt) {
                this.authCodes.delete(code);
            }
        }
    }

    /**
     * Parse scopes from space-separated string
     * @param {string} scopeString - Space-separated scopes
     * @returns {Array<Object>} Scope objects for template
     */
    parseScopes(scopeString) {
        return scopeString.split(' ').map(scope => ({ scope }));
    }

    /**
     * Generate OAuth error redirect URL
     * @param {string} redirectUri - Redirect URI
     * @param {string} error - Error code
     * @param {string} state - State parameter
     * @param {string} errorDescription - Error description
     * @returns {string} Error redirect URL
     */
    generateErrorRedirect(redirectUri, error, state, errorDescription = null) {
        const url = new URL(redirectUri);
        url.searchParams.set('error', error);
        if (state) {
            url.searchParams.set('state', state);
        }
        if (errorDescription) {
            url.searchParams.set('error_description', errorDescription);
        }
        return url.toString();
    }

    /**
     * Generate success redirect URL
     * @param {string} redirectUri - Redirect URI  
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @returns {string} Success redirect URL
     */
    generateSuccessRedirect(redirectUri, code, state) {
        const url = new URL(redirectUri);
        url.searchParams.set('code', code);
        if (state) {
            url.searchParams.set('state', state);
        }
        return url.toString();
    }
}

// Singleton instance
const oauthAuth = new OAuthAuth();

module.exports = oauthAuth;