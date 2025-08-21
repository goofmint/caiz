'use strict';

const winston = require.main.require('winston');
const cache = require('../cache');
const parser = require('../parser');
const renderer = require('../renderer');

const clientSockets = {};

/**
 * Register client socket handlers
 */
clientSockets.registerSockets = function(socketPlugins) {
    socketPlugins['ogp-embed'] = socketPlugins['ogp-embed'] || {};
    
    // Client-side OGP fetch for async loading
    socketPlugins['ogp-embed'].fetch = async function(socket, data) {
        try {
            if (!data || !data.url) {
                throw new Error('URL is required');
            }
            
            const url = data.url;
            winston.info(`[ogp-embed] Client requested OGP data for: ${url}`);
            
            // Check cache first
            let ogpData = await cache.get(url);
            
            if (!ogpData || !ogpData.title) {
                // Not in cache, fetch it now
                winston.info(`[ogp-embed] Fetching OGP data for: ${url}`);
                ogpData = await parser.parse(url);
                
                if (ogpData) {
                    await cache.set(url, ogpData);
                    winston.info(`[ogp-embed] Cached new OGP data for: ${url}`);
                }
            } else {
                winston.info(`[ogp-embed] Cache hit for client request: ${url}`);
            }
            
            if (ogpData && ogpData.title) {
                return ogpData;
            } else {
                return null;
            }
            
        } catch (err) {
            winston.error(`[ogp-embed] Client socket error: ${err.message}`);
            throw err;
        }
    };
    
    winston.info('[ogp-embed] Client socket handlers registered');
};

module.exports = clientSockets;