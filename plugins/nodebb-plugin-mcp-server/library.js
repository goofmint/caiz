'use strict';

const winston = require.main.require('winston');
const MCPServer = require('./lib/server');
const mcpRoutes = require('./routes/mcp');

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
        // Initialize MCP server instance
        plugin.server = new MCPServer();
        await plugin.server.initialize();
        
        // Setup MCP routes under /api/mcp
        router.use('/api/mcp', mcpRoutes);
        
        // Setup admin routes
        setupAdminRoutes(router, middleware);
        
        winston.info('[mcp-server] MCP Server Plugin initialized successfully');
    } catch (err) {
        winston.error('[mcp-server] Failed to initialize plugin:', err);
        throw err;
    }
};

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
        name: 'MCP Server'
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