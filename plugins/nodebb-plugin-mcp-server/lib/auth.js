'use strict';

const winston = require.main.require('winston');

/**
 * Authentication middleware and utilities for MCP server
 * Implements OAuth 2.0 Bearer Token authentication according to RFC 6750
 */
class MCPAuth {
    /**
     * Extract Bearer token from Authorization header
     * @param {Object} req - Express request object
     * @returns {string|null} Bearer token or null if not found
     */
    static extractBearerToken(req) {
        winston.verbose('[mcp-server] Extracting Bearer token from request');
        
        if (!req || !req.headers || typeof req.headers.authorization !== 'string') {
            winston.verbose('[mcp-server] No valid Authorization header found');
            return null;
        }
        
        const authHeader = req.headers.authorization.trim();
        
        // Use regex to match Bearer token format - permissive for JWT/base64url chars
        const bearerMatch = authHeader.match(/^Bearer\s+([A-Za-z0-9\-._~+/=]+)$/i);
        
        if (!bearerMatch) {
            winston.verbose('[mcp-server] Authorization header does not match Bearer token format');
            return null;
        }
        
        const token = bearerMatch[1];
        winston.verbose('[mcp-server] Bearer token extracted successfully');
        return token;
    }
    
    /**
     * Generate WWW-Authenticate header for 401 responses
     * @param {Object} options - Authentication options
     * @param {string} options.realm - Authentication realm
     * @param {string} options.scope - Required OAuth scopes
     * @param {string} options.error - OAuth error code
     * @param {string} options.errorDescription - Human readable error description
     * @returns {string} WWW-Authenticate header value
     */
    static generateWWWAuthenticateHeader(options = {}) {
        winston.verbose('[mcp-server] Generating WWW-Authenticate header');
        
        /**
         * Escape and quote value for HTTP header parameter per RFC 7235
         * @param {string} value - Value to escape and quote
         * @returns {string} Escaped and quoted value
         */
        function escapeAndQuote(value) {
            if (typeof value !== 'string') {
                return '""';
            }
            // Escape backslashes and double quotes per RFC 7235
            const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `"${escaped}"`;
        }
        
        const params = [];
        
        // Always include realm (RFC 6750 requirement)
        const realm = options.realm || this.getDefaultRealm();
        params.push(`realm=${escapeAndQuote(realm)}`);
        
        // Include optional parameters only when provided
        if (options.error) {
            params.push(`error=${escapeAndQuote(options.error)}`);
        }
        
        if (options.errorDescription) {
            params.push(`error_description=${escapeAndQuote(options.errorDescription)}`);
        }
        
        if (options.scope) {
            params.push(`scope=${escapeAndQuote(options.scope)}`);
        }
        
        const header = `Bearer ${params.join(', ')}`;
        winston.verbose('[mcp-server] WWW-Authenticate header generated:', header);
        return header;
    }
    
    /**
     * Send 401 Unauthorized response with proper headers
     * @param {Object} res - Express response object
     * @param {Object} options - Error options
     * @param {string} options.error - OAuth error code
     * @param {string} options.errorDescription - Human readable error description
     * @param {string} options.realm - Authentication realm
     * @param {string} options.scope - Required OAuth scopes
     */
    static send401Response(res, options = {}) {
        winston.verbose('[mcp-server] Sending 401 Unauthorized response');
        
        // Check if headers have already been sent
        if (res.headersSent) {
            winston.warn('[mcp-server] Headers already sent, cannot send 401 response');
            return;
        }
        
        try {
            const wwwAuthHeader = this.generateWWWAuthenticateHeader({
                realm: options.realm,
                error: options.error,
                errorDescription: options.errorDescription,
                scope: options.scope
            });
            
            // Safely set headers - validate header values to prevent injection
            const safeHeaders = {};
            
            // WWW-Authenticate header is already escaped by generateWWWAuthenticateHeader
            safeHeaders['WWW-Authenticate'] = wwwAuthHeader;
            safeHeaders['Content-Type'] = 'application/json';
            
            res.set(safeHeaders);
            res.status(401);
            
            // Create minimal JSON body with only error info when provided
            const body = {};
            if (options.error) {
                body.error = options.error;
            }
            if (options.errorDescription) {
                body.error_description = options.errorDescription;
            }
            
            res.json(body);
            winston.verbose('[mcp-server] 401 response sent successfully');
            
        } catch (err) {
            winston.error('[mcp-server] Error sending 401 response:', err);
            
            // Fallback: try to send a basic 401 response
            if (!res.headersSent) {
                try {
                    res.status(401).end();
                } catch (fallbackErr) {
                    winston.error('[mcp-server] Fallback 401 response also failed:', fallbackErr);
                }
            }
        }
    }
    
    
    /**
     * Get default authentication realm
     * @returns {string} Default realm name
     */
    static getDefaultRealm() {
        return 'MCP Server';
    }
    
    /**
     * Get default required scopes
     * @returns {string} Default scope string
     */
    static getDefaultScope() {
        return 'mcp:read mcp:write';
    }
}

module.exports = MCPAuth;