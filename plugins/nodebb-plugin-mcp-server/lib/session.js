'use strict';

const winston = require.main.require('winston');

/**
 * Scope to capabilities mapping
 */
const SCOPE_CAPABILITIES_MAP = {
    'mcp:read': {
        tools: ['search', 'read'],
        prompts: ['query', 'explain'],
        resources: ['files', 'metadata']
    },
    'mcp:write': {
        tools: ['write', 'update', 'delete'],
        prompts: ['generate', 'modify'],
        resources: ['files', 'database']
    },
    'mcp:admin': {
        tools: ['admin', 'configure'],
        prompts: ['admin_query'],
        resources: ['system', 'users']
    }
};

/**
 * Session management for MCP server
 */
class MCPSession {
    /**
     * Build session response from authentication context
     * @param {Object} authContext - Authentication context from JWT
     * @param {Object} request - Express request object
     * @returns {Object} Session response object
     */
    static buildSessionResponse(authContext, request) {
        winston.verbose('[mcp-server] Building session response');
        
        if (!authContext || typeof authContext !== 'object') {
            throw new Error('Invalid authentication context');
        }
        
        if (!request || typeof request !== 'object') {
            throw new Error('Invalid request object');
        }
        
        const user = this.formatUserInfo(authContext);
        const sessionInfo = this.extractSessionMetadata(request);
        const scopes = this.parseScopes(authContext); // supports 'scope' (space-delimited) or 'scp' (array)
        const capabilities = this.getCapabilitiesFromScopes(scopes);
        
        const response = {
            user_id: user.user_id,
            username: user.username,
            scopes,
            expires_at: this.toRFC3339(authContext.expiresAt),
            issued_at: this.toRFC3339(authContext.issuedAt),
            issuer: authContext.issuer,
            audience: authContext.audience,
            token_type: 'access_token',
            token_id: authContext.tokenId,       // debug purpose only
            session_id: sessionInfo.session_id,
            session_info: sessionInfo,
            capabilities
        };
        
        // Add conditional PII fields based on scopes
        if (user.display_name !== undefined) {
            response.display_name = user.display_name;
        }
        if (user.email !== undefined) {
            response.email = user.email;
        }
        
        winston.verbose('[mcp-server] Session response built successfully');
        return response;
    }

    /**
     * Get user capabilities based on scopes
     * @param {Array<string>} scopes - User's OAuth scopes
     * @returns {Object} Available capabilities
     */
    static getCapabilitiesFromScopes(scopes) {
        winston.verbose('[mcp-server] Getting capabilities from scopes:', scopes);
        
        if (!Array.isArray(scopes)) {
            winston.warn('[mcp-server] Scopes is not an array, returning empty capabilities');
            return { tools: [], prompts: [], resources: [] };
        }
        
        const merged = { tools: new Set(), prompts: new Set(), resources: new Set() };
        
        for (const scope of scopes) {
            const capabilities = SCOPE_CAPABILITIES_MAP[scope];
            if (!capabilities) {
                winston.verbose('[mcp-server] No capabilities found for scope:', scope);
                continue;
            }
            
            capabilities.tools?.forEach(t => merged.tools.add(t));
            capabilities.prompts?.forEach(p => merged.prompts.add(p));
            capabilities.resources?.forEach(r => merged.resources.add(r));
        }
        
        const result = {
            tools: [...merged.tools].sort(),
            prompts: [...merged.prompts].sort(),
            resources: [...merged.resources].sort()
        };
        
        winston.verbose('[mcp-server] Capabilities computed:', result);
        return result;
    }

    /**
     * Extract session metadata from request
     * @param {Object} request - Express request object
     * @returns {Object} Session metadata
     */
    static extractSessionMetadata(request) {
        winston.verbose('[mcp-server] Extracting session metadata');
        
        // Express: ensure app.set('trust proxy', true) is configured; otherwise, don't trust XFF
        const userAgent = request.get('user-agent') || 'Unknown';
        const ipAddress = request.ip; // normalized by Express when trust proxy is set
        
        const sessionInfo = {
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            ip_address: ipAddress,
            user_agent: userAgent,
            session_id: `sess_${Math.random().toString(36).slice(2, 10)}`
        };
        
        winston.verbose('[mcp-server] Session metadata extracted');
        return sessionInfo;
    }

    /**
     * Format user information for response
     * @param {Object} authContext - Authentication context
     * @returns {Object} Formatted user information
     */
    static formatUserInfo(authContext) {
        winston.verbose('[mcp-server] Formatting user info');
        
        if (!authContext || typeof authContext !== 'object') {
            throw new Error('Invalid authentication context for user info formatting');
        }
        
        const userInfo = {
            user_id: String(authContext.userId || authContext.sub),
            username: authContext.username || authContext.preferred_username
        };
        
        // PII fields are only included if the appropriate scopes are present
        if (authContext.scopes?.includes('profile') && authContext.name) {
            userInfo.display_name = authContext.name;
        }
        
        if (authContext.scopes?.includes('email') && authContext.email) {
            userInfo.email = authContext.email;
        }
        
        winston.verbose('[mcp-server] User info formatted for user:', userInfo.user_id);
        return userInfo;
    }
    
    /**
     * Convert Date object to RFC3339 string
     * @param {Date} date - Date object
     * @returns {string|undefined} RFC3339 formatted string
     */
    static toRFC3339(date) {
        if (!date || !(date instanceof Date)) {
            return undefined;
        }
        return date.toISOString();
    }
    
    /**
     * Parse scopes from various JWT formats
     * @param {Object} authContext - Authentication context
     * @returns {Array<string>} Array of scopes
     */
    static parseScopes(authContext) {
        if (!authContext || typeof authContext !== 'object') {
            winston.warn('[mcp-server] Invalid authContext for scope parsing');
            return [];
        }
        
        // Try different scope formats
        if (Array.isArray(authContext.scopes)) {
            return authContext.scopes;
        }
        if (Array.isArray(authContext.scp)) {
            return authContext.scp;
        }
        if (typeof authContext.scope === 'string') {
            return authContext.scope.trim().split(/\s+/);
        }
        
        winston.verbose('[mcp-server] No scopes found in authContext');
        return [];
    }
}

module.exports = MCPSession;