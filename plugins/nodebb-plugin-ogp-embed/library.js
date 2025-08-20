'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const parser = require('./lib/parser');
const cache = require('./lib/cache');
const renderer = require('./lib/renderer');

const plugin = {};
const baseUrl = nconf.get('url');

// URL detection regex - matches URLs at the beginning of a line or markdown links
const URL_REGEX = /^(?:\[([^\]]+)\]\()?((https?:\/\/)[^\s\)]+)(?:\))?$/gm;

/**
 * Plugin initialization
 */
plugin.onLoad = async function(params) {
    const { app, middleware, io } = params;
    
    winston.info('[ogp-embed] Plugin loaded');
    
    // Initialize cache
    await cache.initialize();
    
    // Admin route for settings page
    const routeHelpers = require.main.require('./src/routes/helpers');
    routeHelpers.setupAdminPageRoute(app, '/admin/plugins/ogp-embed', [], (req, res) => {
        res.render('admin/plugins/ogp-embed', {
            title: 'OGP Embed Settings'
        });
    });
    
    // WebSocket handlers
    if (io && io.admin) {
        io.admin.on('admin.ogp-embed.clearCache', async (socket, data, callback) => {
            if (!socket.uid) {
                return callback(new Error('Not authenticated'));
            }
            
            const user = require.main.require('./src/user');
            const isAdmin = await user.isAdministrator(socket.uid);
            if (!isAdmin) {
                return callback(new Error('Forbidden'));
            }
            
            try {
                await cache.clearAll();
                callback(null, { success: true });
            } catch (err) {
                winston.error(`[ogp-embed] Error clearing cache: ${err.message}`);
                callback(err);
            }
        });
    }
    
    if (io) {
        io.on('ogp-embed.testParse', async (socket, data, callback) => {
            const { url } = data;
            
            if (!url) {
                return callback(new Error('URL is required'));
            }
            
            try {
                let ogpData = await cache.get(url);
                
                if (!ogpData) {
                    ogpData = await parser.parse(url);
                    
                    if (ogpData) {
                        await cache.set(url, ogpData);
                    }
                }
                
                callback(null, ogpData || {});
            } catch (err) {
                winston.error(`[ogp-embed] Error testing OGP parse: ${err.message}`);
                callback(err);
            }
        });
        
        io.on('ogp-embed.fetch', async (socket, data, callback) => {
            const { url } = data;
            
            if (!url) {
                return callback(new Error('URL is required'));
            }
            
            try {
                let ogpData = await cache.get(url);
                
                if (!ogpData) {
                    ogpData = await parser.parse(url);
                    
                    if (ogpData) {
                        await cache.set(url, ogpData);
                    }
                }
                
                callback(null, ogpData || {});
            } catch (err) {
                winston.error(`[ogp-embed] Error fetching OGP data: ${err.message}`);
                callback(err);
            }
        });
    }
};

/**
 * Parse raw content before rendering
 * Detect URLs and prepare for OGP embedding
 */
plugin.parseRaw = async function(data) {
    if (!data || !data.postData || !data.postData.content) {
        return data;
    }
    
    const content = data.postData.content;
    const urls = [];
    let match;
    
    // Find all URLs at the beginning of lines
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if line starts with URL or markdown link
        const urlMatch = line.match(/^(?:\[([^\]]+)\]\()?((https?:\/\/)[^\s\)]+)(?:\))?$/);
        if (urlMatch) {
            urls.push({
                url: urlMatch[2],
                lineIndex: i,
                fullMatch: urlMatch[0],
                linkText: urlMatch[1]
            });
        }
    }
    
    // Store URLs for later processing
    data.ogpUrls = urls;
    
    return data;
};

/**
 * Parse post content and embed OGP cards
 */
plugin.parsePost = async function(data) {
    if (!data || !data.postData || !data.postData.content) {
        return data;
    }
    
    // Process each URL found in parseRaw
    if (data.ogpUrls && data.ogpUrls.length > 0) {
        const lines = data.postData.content.split('\n');
        
        for (const urlInfo of data.ogpUrls) {
            try {
                // Get OGP data from cache or fetch
                let ogpData = await cache.get(urlInfo.url);
                
                if (!ogpData) {
                    // Try to parse in background (non-blocking)
                    setImmediate(async () => {
                        try {
                            const parsed = await parser.parse(urlInfo.url);
                            if (parsed) {
                                await cache.set(urlInfo.url, parsed);
                            }
                        } catch (err) {
                            winston.error(`[ogp-embed] Background parse error: ${err.message}`);
                        }
                    });
                    
                    // For now, render placeholder
                    const placeholder = renderer.renderPlaceholder(urlInfo.url);
                    lines[urlInfo.lineIndex] = placeholder;
                } else {
                    // Render OGP card
                    const cardHtml = await renderer.render(ogpData);
                    lines[urlInfo.lineIndex] = cardHtml;
                }
            } catch (err) {
                winston.error(`[ogp-embed] Error processing URL ${urlInfo.url}: ${err.message}`);
                // Keep original line on error
            }
        }
        
        data.postData.content = lines.join('\n');
    }
    
    return data;
};

/**
 * Add admin navigation for OGP settings
 */
plugin.addAdminNavigation = function(header, callback) {
    header.plugins.push({
        route: '/plugins/ogp-embed',
        icon: 'fa-link',
        name: 'OGP Embed Settings'
    });
    
    callback(null, header);
};

module.exports = plugin;