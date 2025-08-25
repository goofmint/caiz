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

/**
 * Handle JSON-RPC 2.0 message processing
 */
function processJsonRpcMessage(message, req) {
    winston.verbose('[mcp-server] Processing JSON-RPC method:', message.method);

    // Handle MCP initialize request
    if (message.method === 'initialize') {
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
            id: message.id
        };
        
        winston.verbose('[mcp-server] Sending initialize response');
        return response;
    }

    // Handle tools/list request
    if (message.method === 'tools/list') {
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
            id: message.id
        };
        
        winston.verbose('[mcp-server] Sending tools list');
        return response;
    }

    // Handle tools/call request
    if (message.method === 'tools/call') {
        if (message.params?.name === 'search') {
            const response = {
                jsonrpc: '2.0',
                result: {
                    content: [
                        {
                            type: 'text',
                            text: `Search results for: ${message.params.arguments?.query || 'N/A'}\n\nThis is a minimal implementation. Full search functionality will be implemented in future versions.`
                        }
                    ]
                },
                id: message.id
            };
            
            winston.verbose('[mcp-server] Sending search results');
            return response;
        }
        
        // Tool not found
        return {
            jsonrpc: '2.0',
            error: {
                code: -32601,
                message: 'Method not found',
                data: `Tool '${message.params?.name}' not found`
            },
            id: message.id
        };
    }

    // Method not found
    return {
        jsonrpc: '2.0',
        error: {
            code: -32601,
            message: 'Method not found',
            data: `Method '${message.method}' not supported`
        },
        id: message.id
    };
}

module.exports = function(router) {
    /**
     * MCP over HTTP Endpoint
     * POST /api/mcp - JSON-RPC messages
     * GET /api/mcp - Server-Sent Events (optional)
     */
    
    /**
     * POST /api/mcp - JSON-RPC 2.0 Message Processing
     * This is the main MCP endpoint as per specification
     */
    router.post('/api/mcp', 
        require('../lib/simple-auth').requireAuth(),
        (req, res) => {
            try {
                winston.verbose('[mcp-server] MCP POST request received');
                // Sanitize headers before logging to avoid leaking tokens
                const sanitizedHeaders = { ...req.headers };
                Object.keys(sanitizedHeaders).forEach(key => {
                    if (key.toLowerCase() === 'authorization') {
                        sanitizedHeaders[key] = '[REDACTED]';
                    }
                });
                winston.verbose('[mcp-server] Request headers:', JSON.stringify(sanitizedHeaders));

                // Validate Accept header
                const acceptHeader = req.get('Accept');
                if (!acceptHeader || (!acceptHeader.includes('application/json') && !acceptHeader.includes('text/event-stream'))) {
                    winston.warn('[mcp-server] Missing or invalid Accept header');
                    return res.status(400).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32600,
                            message: 'Invalid Request - Accept header must include application/json or text/event-stream'
                        }
                    });
                }

                // Basic JSON-RPC validation
                if (!req.body || typeof req.body !== 'object') {
                    winston.warn('[mcp-server] Invalid request body');
                    return res.status(400).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32600,
                            message: 'Invalid Request - Body must be valid JSON'
                        }
                    });
                }

                let messages = Array.isArray(req.body) ? req.body : [req.body];
                let responses = [];
                let hasResponses = false;

                // Process each message
                for (const message of messages) {
                    // Validate JSON-RPC 2.0 format
                    if (!message.jsonrpc || message.jsonrpc !== '2.0') {
                        responses.push({
                            jsonrpc: '2.0',
                            error: {
                                code: -32600,
                                message: 'Invalid Request - jsonrpc must be 2.0'
                            },
                            id: message.id || null
                        });
                        hasResponses = true;
                        continue;
                    }

                    if (!message.method || typeof message.method !== 'string') {
                        responses.push({
                            jsonrpc: '2.0',
                            error: {
                                code: -32600,
                                message: 'Invalid Request - method required and must be string'
                            },
                            id: message.id || null
                        });
                        hasResponses = true;
                        continue;
                    }

                    // Process message and get response
                    const response = processJsonRpcMessage(message, req);
                    
                    // Only add response if message has ID (requests, not notifications)
                    if (message.id !== undefined) {
                        responses.push(response);
                        hasResponses = true;
                    }
                }

                // Send appropriate response based on MCP specification
                if (!hasResponses) {
                    // Pure notifications - return 202 Accepted with no body
                    res.status(202).send();
                    winston.verbose('[mcp-server] Processed notifications, sent 202 Accepted');
                } else {
                    // Has responses - return 200 with JSON
                    res.set('Content-Type', 'application/json');
                    const responseBody = Array.isArray(req.body) ? responses : responses[0];
                    res.status(200).json(responseBody);
                    winston.verbose('[mcp-server] Processed requests, sent responses');
                }

            } catch (err) {
                winston.error('[mcp-server] JSON-RPC processing error:', err);
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal error',
                        data: err.message
                    },
                    id: req.body?.id || null
                });
            }
        }
    );

    /**
     * GET /api/mcp - Server-Sent Events (Optional)
     */
    router.get('/api/mcp', 
        require('../lib/simple-auth').requireAuth(),
        (req, res) => {
            try {
                winston.verbose('[mcp-server] MCP GET request received');

                // Check Accept header for SSE
                const acceptHeader = req.get('Accept');
                if (!acceptHeader || !acceptHeader.includes('text/event-stream')) {
                    winston.verbose('[mcp-server] GET request without SSE accept header, returning 405');
                    res.set('Allow', 'POST');
                    return res.status(405).json({
                        error: 'Method Not Allowed',
                        message: 'GET method only supports Server-Sent Events. Include Accept: text/event-stream header.'
                    });
                }

                winston.verbose('[mcp-server] Starting SSE connection');

                // Set SSE headers
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Authorization, Content-Type'
                });

                // Send initial connection notification
                res.write('data: {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}\n\n');

                // Send periodic heartbeat
                const heartbeatInterval = setInterval(() => {
                    res.write('data: {"jsonrpc": "2.0", "method": "notifications/ping", "params": {"timestamp": "' + new Date().toISOString() + '"}}\n\n');
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
        require('../lib/simple-auth').optionalAuth(),
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
     * MCP Session endpoint - returns authenticated user session info
     * GET /api/mcp/session
     */
    router.get('/api/mcp/session', 
        require('../lib/simple-auth').requireAuth(),
        (req, res) => {
            try {
                winston.verbose('[mcp-server] MCP session requested');
                
                // Build session response using authenticated user info
                const user = {
                    uid: req.auth.userId,
                    username: req.auth.username,
                    displayname: req.auth.displayname
                };
                
                // Only include email if token has appropriate permission
                const tokenPermissions = req.auth.token.permissions || [];
                if (tokenPermissions.includes('user:email:read') || tokenPermissions.includes('read')) {
                    user.email = req.auth.email;
                }
                
                const sessionResponse = {
                    status: 'authenticated',
                    user: user,
                    token: {
                        id: req.auth.token.id,
                        name: req.auth.token.name,
                        permissions: req.auth.token.permissions,
                        created_at: req.auth.token.created_at,
                        last_used_at: req.auth.token.last_used_at
                    },
                    capabilities: {
                        protocolVersion: '2024-11-05',
                        supported_tools: ['search', 'read'],
                        max_message_size: 1048576
                    },
                    session: {
                        authenticated: true,
                        type: 'bearer',
                        scopes: tokenPermissions,  // Use actual token permissions
                        timestamp: new Date().toISOString()
                    }
                };
                
                // Set security headers
                res.set({
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache'
                });
                
                res.status(200).json(sessionResponse);
                winston.verbose('[mcp-server] Session response sent for user:', req.auth.userId);
                
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