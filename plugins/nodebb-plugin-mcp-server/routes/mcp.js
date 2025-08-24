'use strict';

const winston = require.main.require('winston');

// Get plugin version from package.json
let pluginVersion = '1.0.0';
try {
    const packageInfo = require('../package.json');
    pluginVersion = packageInfo.version;
} catch (err) {
    winston.warn('[mcp-server] Could not load package.json, using default version');
}

// Get MCP server instance
function getMCPServer() {
    const plugin = require('../library');
    const instance = plugin.getInstance();
    return instance.server;
}

module.exports = function(router) {
    /**
     * Health check endpoint for MCP server
     * GET /api/mcp/health
     */
    router.get('/api/mcp/health', async (req, res) => {
        try {
            winston.verbose('[mcp-server] Health check requested');
            
            const server = getMCPServer();
            if (!server || !server.isInitialized()) {
                return res.status(503).json({
                    status: 'unavailable',
                    error: 'MCP server not initialized'
                });
            }
            
            const health = await server.getHealth();
            
            // Set appropriate status code based on health
            const statusCode = health.status === 'healthy' ? 200 : 
                              health.status === 'unhealthy' ? 503 : 500;
            
            res.status(statusCode).json(health);
            
            winston.verbose('[mcp-server] Health check completed:', {
                status: health.status,
                statusCode
            });
        } catch (err) {
            winston.error('[mcp-server] Health check error:', err);
            res.status(500).json({
                status: 'error',
                error: err.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    /**
     * Get server metadata
     * GET /api/mcp/metadata
     */
    router.get('/api/mcp/metadata', 
        require('../lib/auth').optionalAuth(),
        async (req, res) => {
            try {
                winston.verbose('[mcp-server] Metadata requested');
                
                const server = getMCPServer();
                if (!server) {
                    return res.status(503).json({
                        error: 'MCP server not available'
                    });
                }
                
                const metadata = server.getMetadata();
                
                // If authenticated, add user-specific information
                if (req.auth) {
                    metadata.user_specific_info = {
                        authenticated: true,
                        user_id: req.auth.userId,
                        scopes: req.auth.scopes
                    };
                    winston.verbose('[mcp-server] Added user-specific metadata for user:', req.auth.userId);
                } else {
                    winston.verbose('[mcp-server] Sending public metadata');
                }
                
                res.json(metadata);
                winston.verbose('[mcp-server] Metadata sent');
                
            } catch (err) {
                winston.error('[mcp-server] Metadata error:', err);
                res.status(500).json({
                    error: err.message
                });
            }
        }
    );

    /**
     * Get server capabilities
     * GET /api/mcp/capabilities
     */
    router.get('/api/mcp/capabilities', async (req, res) => {
        try {
            winston.verbose('[mcp-server] Capabilities requested');
            
            const server = getMCPServer();
            if (!server) {
                return res.status(503).json({
                    error: 'MCP server not available'
                });
            }
            
            const capabilities = server.getCapabilities();
            res.json({
                capabilities,
                timestamp: new Date().toISOString()
            });
            
            winston.verbose('[mcp-server] Capabilities sent');
        } catch (err) {
            winston.error('[mcp-server] Capabilities error:', err);
            res.status(500).json({
                error: err.message
            });
        }
    });

    /**
     * Root endpoint - returns basic information
     * GET /api/mcp/
     */
    router.get('/api/mcp', (req, res) => {
        res.json({
            name: 'NodeBB MCP Server',
            version: pluginVersion,
            endpoints: {
                health: '/api/mcp/health',
                metadata: '/api/mcp/metadata',
                capabilities: '/api/mcp/capabilities'
            },
            documentation: 'https://github.com/goofmint/caiz/tree/main/docs/mcp-server'
        });
    });

    /**
     * MCP Session endpoint
     * GET /api/mcp/session
     */
    router.get('/api/mcp/session', 
        require('../lib/auth').requireAuth(['mcp:read']),
        (req, res) => {
            try {
                winston.verbose('[mcp-server] MCP session requested');
                
                // req.auth is set by requireAuth middleware after successful JWT validation
                const authContext = req.auth;
                
                // Build comprehensive session response using MCPSession
                const MCPSession = require('../lib/session');
                const sessionResponse = MCPSession.buildSessionResponse(authContext, req);
                
                // Set security headers
                res.set({
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache'
                });
                
                res.json(sessionResponse);
                winston.verbose('[mcp-server] Session response sent for user:', authContext.userId);
                
            } catch (err) {
                winston.error('[mcp-server] MCP session error:', err);
                res.status(500).json({
                    error: 'server_error',
                    error_description: 'Internal server error while processing session request'
                });
            }
        }
    );

    return router;
};