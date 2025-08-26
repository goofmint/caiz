'use strict';

const winston = require.main.require('winston');
const MCPServer = require('./lib/server');

const plugin = {
    server: null
};

/**
 * Plugin initialization
 * @param {Object} params - NodeBB initialization parameters
 */
plugin.init = async function(params) {
    const { router, middleware, app } = params;
    
    winston.info('[mcp-server] Initializing MCP Server Plugin');
    
    try {
        // Initialize JWKS manager first
        const JWKSManager = require('./lib/jwks');
        await JWKSManager.initialize();
        
        // Initialize MCP server instance
        plugin.server = new MCPServer();
        await plugin.server.initialize();
        
        // Initialize tool registry and register built-in tools
        const { getToolRegistry } = require('./lib/tool-registry');
        const { BUILTIN_TOOLS } = require('./lib/tools');
        const toolRegistry = getToolRegistry();
        
        // Register all built-in tools
        for (const tool of BUILTIN_TOOLS) {
            // Check if tool already exists (hot-reload idempotency)
            const existingTool = toolRegistry.getTool(tool.name);
            if (existingTool) {
                winston.verbose(`[mcp-server] Tool '${tool.name}' already registered, skipping`);
                continue;
            }

            try {
                toolRegistry.registerTool(tool);
            } catch (err) {
                winston.error(`[mcp-server] Failed to register tool '${tool.name}':`, err);
                // Don't throw on duplicate registration errors for hot-reload compatibility
                if (err.message.includes('already registered')) {
                    winston.warn(`[mcp-server] Tool '${tool.name}' registration skipped: ${err.message}`);
                    continue;
                }
                throw err;
            }
        }
        
        winston.info(`[mcp-server] Registered ${BUILTIN_TOOLS.length} built-in tools`);
        
        // Setup MCP routes under /api/mcp
        const mcpRoutes = require('./routes/mcp');
        mcpRoutes(router);
        
        // Setup OAuth routes
        const oauthRoutes = require('./routes/oauth');
        oauthRoutes(router, middleware);
        
        // Setup admin routes
        setupAdminRoutes(router, middleware);
        
        // Setup .well-known routes at root level (after admin routes)
        // Try both app and router approaches
        if (app) {
            winston.verbose('[mcp-server] Setting up .well-known routes using app');
            setupWellKnownRoutes(app);
        } else {
            winston.verbose('[mcp-server] Setting up .well-known routes using router');
            setupWellKnownRoutes(router);
        }
        
        winston.info('[mcp-server] MCP Server Plugin initialized successfully');
    } catch (err) {
        winston.error('[mcp-server] Failed to initialize plugin:', err);
        throw err;
    }
};

/**
 * Setup .well-known routes at root level
 * @param {Object} routerOrApp - Express router or app instance
 */
function setupWellKnownRoutes(routerOrApp) {
    const ResourceServerMetadata = require('./lib/metadata');
    const JWKSManager = require('./lib/jwks');
    
    // OAuth Resource Server Metadata endpoint
    routerOrApp.get('/.well-known/oauth-protected-resource', (req, res) => {
        try {
            winston.verbose('[mcp-server] Resource server metadata requested');
            
            // Validate configuration before returning metadata
            if (!ResourceServerMetadata.validateConfiguration()) {
                return res.status(500).json({
                    error: 'server_error',
                    error_description: 'Invalid server configuration'
                });
            }
            
            const metadata = ResourceServerMetadata.getMetadata();
            
            // Set appropriate headers for metadata endpoint
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            
            res.json(metadata);
            
            winston.verbose('[mcp-server] Resource server metadata sent successfully');
        } catch (err) {
            winston.error('[mcp-server] Resource server metadata error:', err);
            res.status(500).json({
                error: 'server_error',
                error_description: 'Internal server error while generating metadata'
            });
        }
    });
    
    // JWKS endpoint
    routerOrApp.get('/.well-known/jwks.json', (req, res) => {
        try {
            winston.verbose('[mcp-server] JWKS requested');
            
            const jwks = JWKSManager.getJWKS();
            
            // Set appropriate headers for JWKS endpoint
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            
            res.json(jwks);
            
            winston.verbose('[mcp-server] JWKS sent successfully');
        } catch (err) {
            winston.error('[mcp-server] JWKS endpoint error:', err);
            res.status(500).json({
                error: 'server_error',
                error_description: 'Internal server error while generating JWKS'
            });
        }
    });
    
    // OAuth Authorization Server Discovery endpoint
    routerOrApp.get('/.well-known/oauth-authorization-server', (req, res) => {
        try {
            winston.verbose('[mcp-server] OAuth Discovery metadata requested');
            
            const OAuthDiscovery = require('./lib/oauth-discovery');
            const metadata = OAuthDiscovery.getMetadata();
            
            // Set appropriate headers
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            
            res.json(metadata);
            winston.verbose('[mcp-server] OAuth Discovery metadata sent successfully');
        } catch (err) {
            winston.error('[mcp-server] OAuth Discovery error:', err);
            res.status(500).json({
                error: 'server_error',
                error_description: 'Internal server error while generating OAuth metadata'
            });
        }
    });
}

/**
 * Setup admin routes
 * @param {Object} router - Express router
 * @param {Object} middleware - NodeBB middleware
 */
function setupAdminRoutes(router, middleware) {
    router.get('/admin/plugins/mcp-server', middleware.admin.buildHeader, renderAdmin);
    router.get('/api/admin/plugins/mcp-server', renderAdmin);
}

/**
 * Render admin page
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function renderAdmin(req, res) {
    res.render('admin/plugins/mcp-server', {
        title: 'MCP Server',
        version: '1.0.0'
    });
}

/**
 * Add admin navigation menu
 * @param {Object} header - Admin header object
 * @param {Function} callback - Callback function
 */
plugin.addAdminMenu = function(header, callback) {
    header.plugins.push({
        route: '/plugins/mcp-server',
        icon: 'fa-server',
        name: '[[mcp-server:admin.title]]'
    });
    
    callback(null, header);
};

/**
 * Get plugin instance (for testing)
 * @returns {Object} Plugin instance
 */
plugin.getInstance = function() {
    return {
        server: plugin.server
    };
};

module.exports = plugin;