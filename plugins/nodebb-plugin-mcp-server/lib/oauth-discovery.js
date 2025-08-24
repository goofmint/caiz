'use strict';

const nconf = require.main.require('nconf');

/**
 * OAuth 2.0 Authorization Server Discovery (RFC 8414)
 * Provides metadata for OAuth authorization server endpoints
 */
class OAuthDiscovery {
    /**
     * Get Authorization Server Metadata
     * @returns {Object} OAuth 2.0 Authorization Server Metadata
     */
    static getMetadata() {
        const baseUrl = nconf.get('url');
        if (!baseUrl) {
            throw new Error('Base URL not configured in NodeBB settings');
        }
        
        return {
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/oauth/authorize`,
            token_endpoint: `${baseUrl}/oauth/token`,
            jwks_uri: `${baseUrl}/.well-known/jwks.json`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code", "refresh_token"],
            code_challenge_methods_supported: ["S256"],
            scopes_supported: ["mcp:read", "mcp:write", "mcp:admin"],
            token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
            authorization_response_iss_parameter_supported: true
        };
    }
}

module.exports = OAuthDiscovery;