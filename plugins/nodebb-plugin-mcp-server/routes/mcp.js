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
     * GET /api/mcp and GET /api/mcp/
     */
    router.get('/api/mcp', (req, res) => {
        res.json({
            name: 'NodeBB MCP Server',
            version: pluginVersion,
            protocol: 'mcp',
            protocolVersion: '2024-11-05',
            transport: 'http',
            endpoints: {
                messages: '/api/mcp/messages',
                health: '/api/mcp/health',
                metadata: '/api/mcp/metadata',
                capabilities: '/api/mcp/capabilities',
                session: '/api/mcp/session'
            },
            authentication: {
                type: 'oauth2',
                authorizationUrl: '/.well-known/oauth-protected-resource'
            },
            documentation: 'https://github.com/goofmint/caiz/tree/main/docs/mcp-server'
        });
    });
    
    // Handle trailing slash
    router.get('/api/mcp/', (req, res) => {
        res.json({
            name: 'NodeBB MCP Server',
            version: pluginVersion,
            protocol: 'mcp',
            protocolVersion: '2024-11-05',
            transport: 'http',
            endpoints: {
                messages: '/api/mcp/messages',
                health: '/api/mcp/health',
                metadata: '/api/mcp/metadata',
                capabilities: '/api/mcp/capabilities',
                session: '/api/mcp/session'
            },
            authentication: {
                type: 'oauth2',
                authorizationUrl: '/.well-known/oauth-protected-resource'
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

    /**
     * MCP Messages SSE endpoint
     * GET /api/mcp/messages
     */
    router.get('/api/mcp/messages', 
        require('../lib/auth').requireAuth(['mcp:read']),
        (req, res) => {
            try {
                winston.verbose('[mcp-server] SSE connection requested');

                // Set SSE headers
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Cache-Control'
                });

                // Send initial connection message
                res.write('data: {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}\n\n');

                // Send heartbeat every 30 seconds
                const heartbeatInterval = setInterval(() => {
                    res.write('data: {"jsonrpc": "2.0", "method": "notifications/ping", "params": {}}\n\n');
                }, 30000);

                // Handle client disconnect
                req.on('close', () => {
                    winston.verbose('[mcp-server] SSE connection closed');
                    clearInterval(heartbeatInterval);
                });

                winston.verbose('[mcp-server] SSE connection established');

            } catch (err) {
                winston.error('[mcp-server] SSE connection error:', err);
                res.status(500).json({
                    error: 'server_error',
                    error_description: 'Failed to establish SSE connection'
                });
            }
        }
    );

    /**
     * MCP JSON-RPC endpoint  
     * POST /api/mcp/messages
     */
    router.post('/api/mcp/messages',
        require('../lib/auth').requireAuth(['mcp:read']),
        (req, res) => {
            try {
                winston.verbose('[mcp-server] JSON-RPC message received');

                // Basic JSON-RPC validation
                if (!req.body || typeof req.body !== 'object') {
                    return res.status(400).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32600,
                            message: 'Invalid Request'
                        }
                    });
                }

                const { jsonrpc, method, params, id } = req.body;

                if (jsonrpc !== '2.0') {
                    return res.status(400).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32600,
                            message: 'Invalid Request - jsonrpc must be 2.0'
                        },
                        id: id || null
                    });
                }

                if (!method || typeof method !== 'string') {
                    return res.status(400).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32600,
                            message: 'Invalid Request - method required'
                        },
                        id: id || null
                    });
                }

                winston.verbose('[mcp-server] Processing JSON-RPC method:', method);

                // Handle MCP initialize request
                if (method === 'initialize') {
                    const response = {
                        jsonrpc: '2.0',
                        result: {
                            protocolVersion: '2024-11-05',
                            capabilities: {
                                tools: {},
                                prompts: {},
                                resources: {},
                                logging: {}
                            },
                            serverInfo: {
                                name: 'NodeBB MCP Server',
                                version: pluginVersion
                            }
                        },
                        id
                    };
                    
                    winston.verbose('[mcp-server] Sending initialize response');
                    return res.json(response);
                }

                // Handle tools/list request
                if (method === 'tools/list') {
                    const response = {
                        jsonrpc: '2.0',
                        result: {
                            tools: [
                                {
                                    name: 'search',
                                    description: 'Search NodeBB content',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {
                                            query: {
                                                type: 'string',
                                                description: 'Search query'
                                            }
                                        },
                                        required: ['query']
                                    }
                                }
                            ]
                        },
                        id
                    };
                    
                    winston.verbose('[mcp-server] Sending tools list');
                    return res.json(response);
                }

                // Handle tools/call request
                if (method === 'tools/call') {
                    if (params?.name === 'search') {
                        const response = {
                            jsonrpc: '2.0',
                            result: {
                                content: [
                                    {
                                        type: 'text',
                                        text: `Search results for: ${params.arguments?.query || 'N/A'}\n\nThis is a minimal implementation. Full search functionality will be implemented in future versions.`
                                    }
                                ]
                            },
                            id
                        };
                        
                        winston.verbose('[mcp-server] Sending search results');
                        return res.json(response);
                    }
                }

                // Method not found
                res.status(404).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32601,
                        message: 'Method not found'
                    },
                    id: id || null
                });

            } catch (err) {
                winston.error('[mcp-server] JSON-RPC processing error:', err);
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal error'
                    },
                    id: req.body?.id || null
                });
            }
        }
    );

    return router;
};