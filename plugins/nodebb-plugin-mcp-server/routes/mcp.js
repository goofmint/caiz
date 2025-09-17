'use strict';

const winston = require.main.require('winston');
const { getToolRegistry } = require('../lib/tool-registry');

// Get plugin version from package.json
let pluginVersion = '1.0.0';
try {
    const packageInfo = require('../package.json');
    pluginVersion = packageInfo.version;
} catch (err) {
    winston.warn('[mcp-server] Could not load package.json, using default version');
}

// JSON-RPC Error Codes
const JSON_RPC_ERRORS = {
    PARSE_ERROR: -32700,      // JSON解析エラー
    INVALID_REQUEST: -32600,  // 無効なリクエスト
    METHOD_NOT_FOUND: -32601, // メソッド不明
    INVALID_PARAMS: -32602,   // 無効なパラメータ
    INTERNAL_ERROR: -32603    // サーバー内部エラー
};

/**
 * Build JSON-RPC 2.0 error response
 */
function buildErrorResponse(code, message, data, id) {
    return {
        jsonrpc: '2.0',
        error: {
            code: code,
            message: message,
            data: data // オプショナル
        },
        // JSONパース不可時は null、それ以外は要求と同一の id（0 や "" も許容）
        id: (typeof id === 'undefined') ? null : id
    };
}

/**
 * Validate JSON-RPC 2.0 message structure
 */
function validateJsonRpcMessage(message) {
    // Basic object check
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
        return {
            isValid: false,
            error: buildErrorResponse(JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid Request - message must be object', null, message?.id)
        };
    }

    // jsonrpc: "2.0" 必須チェック
    if (message.jsonrpc !== '2.0') {
        return {
            isValid: false,
            error: buildErrorResponse(JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid Request - jsonrpc must be 2.0', null, message.id)
        };
    }

    // method: string 必須チェック（空文字不可）
    if (!message.method || typeof message.method !== 'string' || message.method.trim() === '') {
        return {
            isValid: false,
            error: buildErrorResponse(JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid Request - method required and must be non-empty string', null, message.id)
        };
    }

    // id: requestは string|number|null を許容、notificationは "id" メンバー自体を持たないこと
    if ('id' in message) {
        const idType = typeof message.id;
        if (idType !== 'string' && idType !== 'number' && message.id !== null) {
            return {
                isValid: false,
                error: buildErrorResponse(JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid Request - id must be string, number, or null', null, message.id)
            };
        }
    }

    // params: オプショナル、存在時は object または array（null は無効）
    if ('params' in message) {
        if (message.params === null || typeof message.params !== 'object') {
            return {
                isValid: false,
                error: buildErrorResponse(JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid Request - params must be object or array', null, message.id)
            };
        }
    }

    return { isValid: true };
}

/**
 * Handle individual JSON-RPC 2.0 message processing
 */
async function processJsonRpcMessage(message, req) {
    winston.verbose('[mcp-server] Processing JSON-RPC method:', message.method);

    // Handle MCP initialize request
    if (message.method === 'initialize') {
        return {
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
                    name: 'Caiz',
                    version: pluginVersion
                }
            },
            id: message.id
        };
    }

    // Handle tools/list request
    if (message.method === 'tools/list') {
        const params = message.params || {};
        const toolRegistry = getToolRegistry();
        const tools = toolRegistry.getToolsList(params);

        // Build JSON-RPC result payload
        const result = {
            tools: tools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema
            })),
            _meta: {
                total: tools.length,
                include_remote: params.include_remote || false,
                include_hidden: params.include_hidden || false
            }
        };

        return {
            jsonrpc: '2.0',
            result: result,
            id: message.id
        };
    }

    // Handle tools/call request
    if (message.method === 'tools/call') {
        const toolName = message.params?.name;
        const toolArguments = message.params?.arguments || {};

        // Ensure toolName is a non-empty string
        if (!toolName || typeof toolName !== 'string' || toolName.trim() === '') {
            return buildErrorResponse(JSON_RPC_ERRORS.INVALID_PARAMS, 'Invalid params', 'Tool name must be a non-empty string', message.id);
        }

        // Ensure toolArguments is an object
        if (typeof toolArguments !== 'object' || toolArguments === null || Array.isArray(toolArguments)) {
            return buildErrorResponse(JSON_RPC_ERRORS.INVALID_PARAMS, 'Invalid params', 'Tool arguments must be an object', message.id);
        }

        const toolRegistry = getToolRegistry();
        const tool = toolRegistry.getTool(toolName);

        if (!tool) {
            return buildErrorResponse(JSON_RPC_ERRORS.METHOD_NOT_FOUND, 'Method not found', `Tool '${toolName}' not found`, message.id);
        }

        // Validate tool input
        try {
            toolRegistry.validateToolInput(toolName, toolArguments);
        } catch (err) {
            return buildErrorResponse(JSON_RPC_ERRORS.INVALID_PARAMS, 'Invalid params', err.message, message.id);
        }

        // Execute tool
        let result;
        if (toolName === 'search') {
            const searchHandler = require('../lib/tools/search-handler');
            const query = toolArguments?.query;
            const category = toolArguments?.category;
            const limit = toolArguments?.limit || 20;
            // Advanced options passed through without changing function signature
            const options = {
                userId: req.auth?.userId || 0,
                roles: req.auth?.roles || [],
                locale: req.headers['accept-language'] || 'en',
                limit: limit,
                maxLimit: 50,
                traceId: req.headers['x-trace-id'] || null,
                // New filters (validated by Ajv prior to here)
                categorySlugs: toolArguments?.categorySlugs,
                includeSubcategories: toolArguments?.includeSubcategories,
                tags: toolArguments?.tags,
                authorUserIds: toolArguments?.authorUserIds,
                authorUsernames: toolArguments?.authorUsernames,
                dateRange: toolArguments?.dateRange,
                page: toolArguments?.page,
                pageSize: toolArguments?.pageSize,
                sort: toolArguments?.sort,
            };
            
            // Get user context from request
            const userId = req.auth?.userId || 0;
            const roles = req.auth?.roles || [];
            
            winston.verbose('[mcp-server] Search tool called with auth context:', {
                userId: userId,
                username: req.auth?.username,
                clientId: req.auth?.clientId,
                scopes: req.auth?.scopes,
                query: query,
                category: category
            });
            
            try {
                result = await searchHandler.executeSearch(query, category, options);
            } catch (err) {
                winston.error('[mcp-server] Search execution error:', err);
                result = searchHandler.handleSearchError(err, query, category);
            }
        } else if (toolName === 'read') {
            const contentType = toolArguments?.type;
            const contentId = toolArguments?.id;
            
            result = {
                content: [
                    {
                        type: 'text',
                        text: `Reading ${contentType} with ID: ${contentId}\n\nThis is a minimal implementation. Full read functionality will be implemented in future versions.`
                    }
                ]
            };
        } else {
            return buildErrorResponse(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error', `Tool '${toolName}' implementation not found`, message.id);
        }

        return {
            jsonrpc: '2.0',
            result: result,
            id: message.id
        };
    }

    // Method not found
    return buildErrorResponse(JSON_RPC_ERRORS.METHOD_NOT_FOUND, 'Method not found', `Method '${message.method}' not supported`, message.id);
}

/**
 * Process notification message (id absent)
 */
function processNotification(message, req) {
    winston.verbose('[mcp-server] Processing notification:', message.method);
    // 副作用処理の実行（現在は何もしない）
    // レスポンスは返却しない
}

/**
 * Process request message (id present)
 * This function is currently not used in the main flow but kept for future use
 */
async function processRequest(message, req) {
    try {
        const result = await processJsonRpcMessage(message, req);
        return result; // processJsonRpcMessage already returns the full JSON-RPC response
    } catch (err) {
        winston.error('[mcp-server] Error processing request:', err);
        return buildErrorResponse(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error', err.message, message.id);
    }
}

/**
 * Process batch request
 */
async function processBatchRequest(messages, req) {
    // 空配列は配列に包まれた単一の error(-32600) を返す
    if (messages.length === 0) {
        return [buildErrorResponse(JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid Request - empty batch array')];
    }

    const responses = [];
    let hasResponses = false;

    // 各メッセージの個別バリデーション
    for (const message of messages) {
        const validation = validateJsonRpcMessage(message);
        
        if (!validation.isValid) {
            // バリデーションエラーのあるアイテムは、idがない場合はnullをidに設定
            const errorResponse = validation.error;
            if (!('id' in message)) {
                errorResponse.id = null;
            }
            responses.push(errorResponse);
            hasResponses = true;
            continue;
        }

        // id を持つもののみレスポンス配列に含める（requests）
        if ('id' in message) {
            try {
                // 各メッセージの処理をtry/catchで包む
                const response = await processJsonRpcMessage(message, req);
                responses.push(response);
                hasResponses = true;
            } catch (err) {
                // 処理エラーが発生した場合、そのメッセージのエラーレスポンスを作成
                winston.error('[mcp-server] Error processing batch message:', err);
                const errorResponse = buildErrorResponse(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error', err.message, message.id);
                responses.push(errorResponse);
                hasResponses = true;
            }
        } else {
            // 通知の処理（エラーが発生してもバッチ処理は継続）
            try {
                processNotification(message, req);
            } catch (err) {
                winston.error('[mcp-server] Error processing notification in batch:', err);
                // 通知のエラーはレスポンスに含めない
            }
        }
    }

    // 全通知（レスポンス配列が空）の場合は null を返して 204 No Content にする
    if (!hasResponses) {
        return null; // Indicates 204 No Content
    }

    return responses;
}

/**
 * Validate HTTP headers for POST JSON-RPC requests
 */
function validateHeaders(req) {
    // POST JSON-RPC: Accept ヘッダーが必須で "application/json" を含むこと（大文字小文字区別なし）
    const acceptHeader = req.get('Accept');
    if (!acceptHeader) {
        return {
            valid: false,
            statusCode: 406,
            error: { error: 'Not Acceptable', message: 'Accept header is required' }
        };
    }
    
    if (!acceptHeader.toLowerCase().includes('application/json')) {
        return {
            valid: false,
            statusCode: 406,
            error: { error: 'Not Acceptable', message: 'Accept header must include application/json' }
        };
    }

    // Content-Type: POST時は "application/json" で開始すること（charset等パラメータは許容）
    const contentType = req.get('Content-Type');
    if (!contentType) {
        return {
            valid: false,
            statusCode: 415,
            error: { error: 'Unsupported Media Type', message: 'Content-Type header is required' }
        };
    }

    // ';' より前のメディアタイプ部分のみをチェック（大文字小文字区別なし）
    const mediaType = contentType.split(';')[0].trim().toLowerCase();
    if (mediaType !== 'application/json') {
        return {
            valid: false,
            statusCode: 415,
            error: { error: 'Unsupported Media Type', message: 'Content-Type must be application/json' }
        };
    }

    return { valid: true };
}

// Get MCP server instance
function getMCPServer() {
    const plugin = require('../library');
    const instance = plugin.getInstance();
    return instance.server;
}

/**
 * Enhanced 401 response for MCP initial connection
 * Provides OAuth2 Device Authorization Grant flow information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function sendMCPAuthenticationRequired(req, res) {
    const authServerUrl = `${req.protocol}://${req.get('Host')}`;
    const deviceAuthUrl = `${authServerUrl}/api/oauth/device_authorization`;
    const tokenUrl = `${authServerUrl}/api/oauth/token`;
    
    // Log authentication flow initiation for audit
    winston.info('[mcp-server] OAuth2 authentication flow initiated', {
        clientIP: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        timestamp: new Date().toISOString()
    });
    
    res.status(401).set({
        'WWW-Authenticate': `Bearer realm="MCP API", error="invalid_token", error_description="Authentication required"`,
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
    }).json({
        error: 'authentication_required',
        error_description: 'MCP access requires OAuth2 authentication',
        oauth2: {
            device_authorization_endpoint: deviceAuthUrl,
            token_endpoint: tokenUrl,
            grant_types_supported: ['urn:ietf:params:oauth:grant-type:device_code'],
            scopes_supported: ['mcp:read', 'mcp:write'],
            client_id: 'mcp-client'
        },
        instructions: {
            step1: 'Make POST request to device_authorization_endpoint with client_id',
            step2: 'Direct user to verification_uri with user_code',
            step3: 'Poll token_endpoint until authorization is complete',
            step4: 'Retry MCP connection with access_token'
        }
    });
}

/**
 * Monitor token expiration during SSE connection
 * Send authentication events when token expires
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} authInfo - Authentication information
 */
function monitorTokenExpiration(req, res, authInfo) {
    if (!authInfo || !authInfo.tokenExpiresAt) {
        winston.verbose('[mcp-server] No token expiration info available for monitoring');
        return;
    }
    
    const expiryTime = new Date(authInfo.tokenExpiresAt).getTime();
    const now = Date.now();
    const timeToExpiry = expiryTime - now;
    
    winston.verbose('[mcp-server] Token monitoring setup', {
        expiresAt: authInfo.tokenExpiresAt,
        timeToExpiry: timeToExpiry,
        userId: authInfo.userId
    });
    
    // If token expires within 5 minutes, schedule expiration warning
    if (timeToExpiry > 0 && timeToExpiry < 300000) { // 5分以内に期限切れ
        const warningDelay = Math.max(0, timeToExpiry - 300000); // 5分前に通知
        
        setTimeout(() => {
            try {
                if (res.writableEnded) {
                    winston.verbose('[mcp-server] SSE connection closed, skipping token expiry warning');
                    return;
                }
                
                const expiryNotification = {
                    jsonrpc: '2.0',
                    method: 'notifications/token_expiring',
                    params: {
                        expires_in: Math.max(0, Math.floor((expiryTime - Date.now()) / 1000)),
                        refresh_required: true,
                        message: 'Access token will expire soon. Please refresh your authentication.'
                    }
                };
                
                res.write(`event: token_expiring\n`);
                res.write(`data: ${JSON.stringify(expiryNotification)}\n\n`);
                
                winston.info('[mcp-server] Token expiration warning sent', {
                    userId: authInfo.userId,
                    expiresIn: expiryNotification.params.expires_in
                });
            } catch (err) {
                winston.error('[mcp-server] Error sending token expiry warning:', err);
            }
        }, warningDelay);
    }
}

/**
 * MCP authentication middleware with enhanced 401 response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
async function mcpAuthenticate(req, res, next) {
    const OAuthAuthenticator = require('../lib/unified-auth');
    
    // Extract Bearer token
    const token = OAuthAuthenticator.extractBearerToken(req.get('Authorization'));
    
    if (!token) {
        winston.verbose('[mcp-server] No Bearer token provided for MCP endpoint');
        return sendMCPAuthenticationRequired(req, res);
    }

    // Validate token through unified auth
    try {
        await OAuthAuthenticator.authenticate(req, res, next);
    } catch (err) {
        winston.verbose('[mcp-server] MCP authentication failed:', err.message);
        return sendMCPAuthenticationRequired(req, res);
    }

    // Enforce minimal scope for SSE endpoint
    try {
        const requiredScope = 'mcp:sse:read';
        if (req.method === 'GET' && req.path === '/api/mcp') {
            const scopes = Array.isArray(req.auth?.scopes) ? req.auth.scopes : [];
            if (!scopes.includes(requiredScope)) {
                const OAuthAuthenticator = require('../lib/unified-auth');
                return OAuthAuthenticator.sendInsufficientScope(res, [requiredScope]);
            }
        }
    } catch (e) {
        winston.error('[mcp-server] Scope enforcement error:', e);
        return sendMCPAuthenticationRequired(req, res);
    }
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
        mcpAuthenticate,
        async (req, res) => {
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

                // Validate HTTP headers first
                const headerValidation = validateHeaders(req);
                if (!headerValidation.valid) {
                    winston.warn('[mcp-server] Header validation failed:', headerValidation.error);
                    return res.status(headerValidation.statusCode).json(headerValidation.error);
                }

                // Basic JSON body validation - Express should have parsed this already
                if (!req.body) {
                    winston.warn('[mcp-server] Missing request body');
                    return res.status(400).json(
                        buildErrorResponse(JSON_RPC_ERRORS.PARSE_ERROR, 'Parse error', 'Request body is empty')
                    );
                }

                // Determine if this is a batch request or single request
                const isBatch = Array.isArray(req.body);
                let result;

                if (isBatch) {
                    // Process batch request
                    result = await processBatchRequest(req.body, req);
                    
                    // Handle 204 No Content case (all notifications)
                    if (result === null) {
                        res.status(204).send();
                        winston.verbose('[mcp-server] Processed batch notifications, sent 204 No Content');
                        return;
                    }
                } else {
                    // Process single request
                    const validation = validateJsonRpcMessage(req.body);
                    if (!validation.isValid) {
                        winston.warn('[mcp-server] Single message validation failed');
                        return res.status(422).json(validation.error);
                    }

                    // Check if it's a notification (no id) or request (has id)
                    if (!('id' in req.body)) {
                        // Notification - process but don't respond
                        processNotification(req.body, req);
                        res.status(204).send();
                        winston.verbose('[mcp-server] Processed notification, sent 204 No Content');
                        return;
                    } else {
                        // Request - process and return response
                        result = await processJsonRpcMessage(req.body, req);
                    }
                }

                // Set security headers for JSON responses
                res.set({
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache',
                    'X-Content-Type-Options': 'nosniff'
                });

                // Send response
                res.status(200).json(result);
                winston.verbose('[mcp-server] Processed JSON-RPC request(s), sent response');

            } catch (err) {
                winston.error('[mcp-server] JSON-RPC processing error:', err);
                
                // Handle different types of errors
                let statusCode = 500;
                let errorResponse;
                
                if (err instanceof SyntaxError && err.message.includes('JSON')) {
                    // JSON parse error
                    statusCode = 400;
                    errorResponse = buildErrorResponse(JSON_RPC_ERRORS.PARSE_ERROR, 'Parse error', err.message);
                } else {
                    // Internal server error
                    errorResponse = buildErrorResponse(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error', err.message, req.body?.id);
                }

                res.status(statusCode).json(errorResponse);
            }
        }
    );

    // Connection management for SSE
    const sseConnections = new Map();
    const connectionsByUser = new Map();
    let connectionId = 0;
    let activeConnections = 0;
    
    // Connection limits
    const MAX_TOTAL_CONNECTIONS = 100;
    const MAX_CONNECTIONS_PER_USER = 5;

    /**
     * GET /api/mcp - Server-Sent Events
     */
    router.get('/api/mcp', 
        mcpAuthenticate,
        (req, res) => {
            try {
                winston.verbose('[mcp-server] MCP GET request received');

                // Accept header validation - 406 for explicit rejection
                const acceptHeader = req.get('Accept') || '';
                if (acceptHeader && !acceptHeader.includes('text/event-stream') && !acceptHeader.includes('*/*')) {
                    winston.verbose('[mcp-server] Accept header explicitly excludes text/event-stream');
                    return res.status(406).json({ 
                        error: 'Not Acceptable',
                        message: 'This endpoint only supports text/event-stream'
                    });
                }

                const connId = ++connectionId;
                const userId = req.auth.userId;

                // Check connection limits before opening stream
                if (activeConnections >= MAX_TOTAL_CONNECTIONS) {
                    winston.warn(`[mcp-server] Global connection limit exceeded: ${activeConnections}/${MAX_TOTAL_CONNECTIONS}`);
                    return res.status(503).json({
                        error: 'Service Unavailable',
                        message: 'Server at maximum capacity'
                    });
                }

                const userConnections = connectionsByUser.get(userId) || new Set();
                if (userConnections.size >= MAX_CONNECTIONS_PER_USER) {
                    winston.warn(`[mcp-server] Per-user connection limit exceeded for user ${userId}: ${userConnections.size}/${MAX_CONNECTIONS_PER_USER}`);
                    return res.status(429).json({
                        error: 'Too Many Requests',
                        message: 'Maximum connections per user exceeded'
                    });
                }

                winston.verbose('[mcp-server] Starting SSE connection');

                // Increment counters after checks pass
                activeConnections++;
                userConnections.add(connId);
                connectionsByUser.set(userId, userConnections);

                // Set SSE headers per specification
                const sseHeaders = {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'  // nginx buffering disabled
                };

                res.set(sseHeaders);
                
                // Express: immediately flush headers
                if (res.flushHeaders) {
                    res.flushHeaders();
                }
                
                // Preamble to keep some proxies happy
                res.write(':ok\n\n');

                // Get plugin version
                let pluginVersion = '1.0.0';
                try {
                    const packageInfo = require('../package.json');
                    pluginVersion = packageInfo.version;
                } catch (err) {
                    winston.warn('[mcp-server] Could not load package.json version');
                }

                // Send initial connection notification
                const initNotification = {
                    jsonrpc: '2.0',
                    method: 'notifications/initialized',
                    params: {
                        protocolVersion: '2024-11-05',
                        serverInfo: {
                            name: 'Caiz',
                            version: pluginVersion
                        },
                        capabilities: {
                            tools: {},
                            prompts: {},
                            resources: {},
                            logging: {}
                        }
                    }
                };

                res.write(`event: initialized\n`);
                res.write(`data: ${JSON.stringify(initNotification)}\n\n`);

                // Monitor token expiration during SSE connection
                monitorTokenExpiration(req, res, req.auth);

                // Idempotent teardown function with proper cleanup
                let teardownDone = false;
                let heartbeatInterval;
                const teardown = () => {
                    if (teardownDone) return;
                    teardownDone = true;
                    
                    clearInterval(heartbeatInterval);
                    sseConnections.delete(connId);
                    
                    // Update connection counters
                    activeConnections--;
                    const userConns = connectionsByUser.get(userId);
                    if (userConns) {
                        userConns.delete(connId);
                        if (userConns.size === 0) {
                            connectionsByUser.delete(userId);
                        }
                    }
                    
                    // End the response stream
                    try {
                        res.end();
                    } catch (err) {
                        // Response already ended/closed
                    }
                    
                    winston.verbose(`[mcp-server] SSE connection closed: ${connId} (user: ${userId}, active: ${activeConnections})`);
                };

                // Start heartbeat with improved timing
                heartbeatInterval = setInterval(() => {
                    try {
                        const payload = {
                            jsonrpc: '2.0',
                            method: 'notifications/ping',
                            params: { 
                                timestamp: new Date().toISOString(), 
                                server: 'Caiz' 
                            }
                        };
                        res.write(`event: ping\n`);
                        res.write(`data: ${JSON.stringify(payload)}\n\n`);
                    } catch (err) {
                        winston.error('[mcp-server] Error sending heartbeat:', err);
                        teardown(); // Use teardown function for cleanup
                    }
                }, 15000); // 15 seconds for proxy compatibility

                // Store connection info
                sseConnections.set(connId, {
                    userId: userId,
                    connId: connId,
                    startTime: Date.now(),
                    heartbeatInterval: heartbeatInterval
                });

                req.on('close', teardown);
                req.on('aborted', teardown);

                winston.verbose(`[mcp-server] SSE connection established: ${connId} (user: ${userId}, total: ${sseConnections.size})`);

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
        require('../lib/unified-auth').optionalAuth,
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
        mcpAuthenticate,
        (req, res) => {
            try {
                winston.verbose('[mcp-server] MCP session requested');
                
                // Build session response using OAuth2 authenticated user info
                const user = {
                    uid: req.auth.userId,
                    username: req.auth.username,
                    displayname: req.auth.displayname
                };
                
                // Include email for OAuth2 tokens (scopes control access)
                if (req.auth.email && req.auth.scopes && req.auth.scopes.includes('mcp:read')) {
                    user.email = req.auth.email;
                }
                
                const sessionResponse = {
                    status: 'authenticated',
                    user: user,
                    oauth2: {
                        client_id: req.auth.clientId,
                        scopes: req.auth.scopes || [],
                        token_hint: req.auth.tokenHint,
                        expires_at: req.auth.tokenExpiresAt,
                        expiry_seconds: req.auth.tokenExpirySeconds,
                        authenticated_at: req.auth.authenticatedAt
                    },
                    capabilities: {
                        protocolVersion: '2024-11-05',
                        supported_tools: ['search', 'read'],
                        max_message_size: 1048576,
                        supported_grants: ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
                        token_format: 'opaque'
                    },
                    session: {
                        authenticated: true,
                        type: 'oauth2',
                        auth_method: req.auth.type,
                        scopes: req.auth.scopes || [],
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
