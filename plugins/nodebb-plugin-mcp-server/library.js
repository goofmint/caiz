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
    const { router, middleware } = params;
    
    winston.info('[mcp-server] Initializing MCP Server Plugin');
    
    try {
        // Initialize JWKS manager first
        const JWKSManager = require('./lib/jwks');
        await JWKSManager.initialize();
        
        // Initialize MCP server instance
        plugin.server = new MCPServer();
        await plugin.server.initialize();
        
        // Setup MCP routes under /api/mcp
        const mcpRoutes = require('./routes/mcp');
        mcpRoutes(router);
        
        // Setup admin routes
        setupAdminRoutes(router, middleware);
        
        // Setup .well-known routes at root level (after admin routes)
        setupWellKnownRoutes(params.app);
        
        winston.info('[mcp-server] MCP Server Plugin initialized successfully');
    } catch (err) {
        winston.error('[mcp-server] Failed to initialize plugin:', err);
        throw err;
    }
};

/**
 * Setup .well-known routes at root level
 * @param {Object} app - Express app instance
 */
function setupWellKnownRoutes(app) {
    const ResourceServerMetadata = require('./lib/metadata');
    const JWKSManager = require('./lib/jwks');
    
    // OAuth Resource Server Metadata endpoint
    app.get('/.well-known/oauth-protected-resource', (req, res) => {
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
    app.get('/.well-known/jwks.json', (req, res) => {
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