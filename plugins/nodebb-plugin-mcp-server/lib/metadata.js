'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');

/**
 * OAuth 2.0 Resource Server Metadata provider
 * Implements RFC 8414 specification for MCP server
 */
class ResourceServerMetadata {
    /**
     * Get resource server metadata according to RFC 8414
     * @returns {Object} Resource server metadata object
     */
    static getMetadata() {
        winston.verbose('[mcp-server] Generating resource server metadata');
        
        try {
            const baseUrl = this.getBaseUrl();
            
            return {
                resource: baseUrl,
                authorization_servers: this.getAuthorizationServers(),
                jwks_uri: `${baseUrl}/.well-known/jwks.json`,
                scopes_supported: this.getSupportedScopes(),
                response_types_supported: ["code"],
                subject_types_supported: ["public"],
                token_endpoint_auth_methods_supported: [
                    "client_secret_basic",
                    "client_secret_post"
                ]
            };
        } catch (err) {
            winston.error('[mcp-server] Failed to generate metadata:', err);
            throw err;
        }
    }
    
    /**
     * Validate metadata configuration
     * @returns {boolean} Validation result
     */
    static validateConfiguration() {
        winston.verbose('[mcp-server] Validating metadata configuration');
        
        try {
            const baseUrl = this.getBaseUrl();
            
            // Check if base URL is valid
            if (!baseUrl || !baseUrl.startsWith('http')) {
                winston.error('[mcp-server] Invalid base URL configuration:', baseUrl);
                return false;
            }
            
            // Check if scopes are defined
            const scopes = this.getSupportedScopes();
            if (!Array.isArray(scopes) || scopes.length === 0) {
                winston.error('[mcp-server] No scopes defined');
                return false;
            }
            
            // Check authorization servers
            const authServers = this.getAuthorizationServers();
            if (!Array.isArray(authServers) || authServers.length === 0) {
                winston.error('[mcp-server] No authorization servers configured');
                return false;
            }
            
            winston.info('[mcp-server] Metadata configuration is valid');
            return true;
        } catch (err) {
            winston.error('[mcp-server] Metadata configuration validation failed:', err);
            return false;
        }
    }
    
    /**
     * Get supported OAuth 2.0 scopes for MCP operations
     * @returns {Array<string>} Supported scopes
     */
    static getSupportedScopes() {
        return [
            "mcp:read",
            "mcp:write", 
            "mcp:admin"
        ];
    }
    
    /**
     * Get authorization server endpoints
     * @returns {Array<string>} Authorization server URLs
     */
    static getAuthorizationServers() {
        const baseUrl = this.getBaseUrl();
        return [baseUrl];
    }
    
    /**
     * Get base URL for the server
     * @returns {string} Base URL
     * @private
     */
    static getBaseUrl() {
        const url = nconf.get('url');
        if (!url) {
            throw new Error('NodeBB URL not configured in nconf');
        }
        return url;
    }
}

module.exports = ResourceServerMetadata;