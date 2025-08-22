'use strict';

const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const privileges = require.main.require('./src/privileges');
const socketPlugins = require.main.require('./src/socket.io/plugins');

const SettingsManager = require('./lib/config/settings');
const PromptManager = require('./lib/translation/prompt-manager');
const GeminiApiClient = require('./lib/translation/api-client');

const plugin = {
    settingsManager: null,
    promptManager: null,
    apiClient: null
};


/**
 * Plugin initialization
 */
plugin.onAppLoad = async function(params) {
    const { router, middleware } = params;
    
    winston.info('[auto-translate] Initializing Auto Translate Plugin');
    
    // Initialize managers
    plugin.settingsManager = new SettingsManager();
    plugin.promptManager = new PromptManager();
    plugin.apiClient = new GeminiApiClient();
    
    // Load initial settings
    await plugin.settingsManager.init();
    
    // Setup admin routes
    setupAdminRoutes(router, middleware);
    
    // Setup socket handlers
    setupSocketHandlers();
    
    winston.info('[auto-translate] Plugin initialized successfully');
};

/**
 * Add admin navigation menu
 */
plugin.addAdminMenu = function(header, callback) {
    header.plugins.push({
        route: '/plugins/auto-translate',
        icon: 'fa-language',
        name: '[[auto-translate:auto-translate]]'
    });
    
    callback(null, header);
};

/**
 * Setup admin routes
 */
function setupAdminRoutes(router, middleware) {
    router.get('/admin/plugins/auto-translate', middleware.admin.buildHeader, renderAdmin);
    router.get('/api/admin/plugins/auto-translate', renderAdmin);
}

/**
 * Render admin page
 */
function renderAdmin(req, res) {
    res.render('admin/plugins/auto-translate', {
        title: '[[auto-translate:admin.title]]'
    });
}

/**
 * Setup socket handlers for admin
 */
function setupSocketHandlers() {
    const sockets = require.main.require('./src/socket.io/plugins');
    sockets.autoTranslate = {};
    
    // Get current settings
    sockets.autoTranslate.getSettings = async function(socket, data) {
        await requireAdmin(socket);
        
        try {
            const settings = await plugin.settingsManager.getSettings();
            return settings;
        } catch (err) {
            winston.error('[auto-translate] Failed to get settings:', err);
            throw err;
        }
    };
    
    // Save settings
    sockets.autoTranslate.saveSettings = async function(socket, data) {
        await requireAdmin(socket);
        
        try {
            await plugin.settingsManager.saveSettings(data);
            winston.info('[auto-translate] Settings saved by uid:', socket.uid);
            return { success: true };
        } catch (err) {
            winston.error('[auto-translate] Failed to save settings:', err);
            throw err;
        }
    };
    
    // Test API connection
    sockets.autoTranslate.testConnection = async function(socket, data) {
        await requireAdmin(socket);
        
        let apiKey = data.apiKey;
        
        // If useSavedKey is true, get the saved API key
        if (data.useSavedKey && !apiKey) {
            const settings = await plugin.settingsManager.getRawSettings();
            if (settings.api && settings.api.geminiApiKey) {
                apiKey = settings.api.geminiApiKey;
            }
        }
        
        winston.info('[auto-translate] Test connection called with data:', { 
            hasApiKey: !!apiKey, 
            apiKeyLength: apiKey ? apiKey.length : 0,
            apiKeyPrefix: apiKey ? apiKey.substring(0, 6) + '...' : 'none',
            useSavedKey: !!data.useSavedKey
        });
        
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        try {
            const result = await plugin.apiClient.testConnection(apiKey);
            return result;
        } catch (err) {
            winston.error('[auto-translate] API test failed:', err);
            throw err;
        }
    };
    
    winston.info('[auto-translate] Socket handlers registered');
}

/**
 * Check admin privileges
 */
async function requireAdmin(socket) {
    if (!socket.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    
    const user = require.main.require('./src/user');
    const isAdmin = await user.isAdministrator(socket.uid);
    if (!isAdmin) {
        throw new Error('[[error:no-privileges]]');
    }
}

module.exports = plugin;