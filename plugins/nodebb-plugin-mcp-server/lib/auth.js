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
        
        if (!req.headers || !req.headers.authorization) {
            winston.verbose('[mcp-server] No Authorization header found');
            return null;
        }
        
        const authHeader = req.headers.authorization;
        const parts = authHeader.split(' ');
        
        if (parts.length !== 2) {
            winston.verbose('[mcp-server] Invalid Authorization header format');
            return null;
        }
        
        const scheme = parts[0];
        const token = parts[1];
        
        if (scheme.toLowerCase() !== 'bearer') {
            winston.verbose('[mcp-server] Authorization scheme is not Bearer');
            return null;
        }
        
        if (!token) {
            winston.verbose('[mcp-server] Bearer token is empty');
            return null;
        }
        
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
        
        const realm = options.realm || this.getDefaultRealm();
        const scope = options.scope || this.getDefaultScope();
        const error = options.error || 'invalid_token';
        
        let header = `Bearer realm="${realm}"`;
        
        if (scope) {
            header += `, scope="${scope}"`;
        }
        
        if (error) {
            header += `, error="${error}"`;
        }
        
        if (options.errorDescription) {
            header += `, error_description="${options.errorDescription}"`;
        }
        
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
        
        const error = options.error || 'unauthorized';
        const errorDescription = options.errorDescription || 'Bearer token required for MCP session access';
        const realm = options.realm || this.getDefaultRealm();
        const scope = options.scope || this.getDefaultScope();
        
        const wwwAuthHeader = this.generateWWWAuthenticateHeader({
            realm,
            scope,
            error: options.error || 'invalid_token',
            errorDescription
        });
        
        res.set({
            'WWW-Authenticate': wwwAuthHeader,
            'Content-Type': 'application/json'
        });
        
        res.status(401).json({
            error,
            error_description: errorDescription,
            realm,
            scope
        });
        
        winston.verbose('[mcp-server] 401 response sent');
    }
    
    /**
     * Validate Bearer token format
     * @param {string} token - Bearer token to validate
     * @returns {boolean} True if token format is valid
     */
    static validateTokenFormat(token) {
        winston.verbose('[mcp-server] Validating Bearer token format');
        
        if (!token || typeof token !== 'string') {
            winston.verbose('[mcp-server] Token is not a string');
            return false;
        }
        
        // Basic format validation - at least 10 characters
        if (token.length < 10) {
            winston.verbose('[mcp-server] Token too short');
            return false;
        }
        
        // Check for valid characters (alphanumeric, -, _, ., ~, +, /)
        const validTokenRegex = /^[A-Za-z0-9\-._~+/]+=*$/;
        if (!validTokenRegex.test(token)) {
            winston.verbose('[mcp-server] Token contains invalid characters');
            return false;
        }
        
        winston.verbose('[mcp-server] Token format is valid');
        return true;
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