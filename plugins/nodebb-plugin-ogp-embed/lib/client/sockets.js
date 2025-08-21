'use strict';

const winston = require.main.require('winston');
const cache = require('../cache');
const parser = require('../parser');
const renderer = require('../renderer');

const clientSockets = {};

/**
 * Validate and normalize URL to prevent SSRF attacks
 * @param {string} urlString - URL to validate
 * @returns {string} Normalized URL
 * @throws {Error} If URL is invalid or blocked
 */
function validateAndNormalizeURL(urlString) {
    let url;
    
    // Parse URL using WHATWG URL constructor
    try {
        url = new URL(urlString);
    } catch (err) {
        throw new Error('Invalid URL format');
    }
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
    }
    
    // Block local/private addresses
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost and common local names
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        throw new Error('Local URLs are not allowed');
    }
    
    // Block private IP ranges (simplified check)
    const ipv4Pattern = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
    const match = hostname.match(ipv4Pattern);
    if (match) {
        const [, a, b, c, d] = match.map(Number);
        
        // Check private ranges
        if (
            (a === 10) || // 10.0.0.0/8
            (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
            (a === 192 && b === 168) || // 192.168.0.0/16
            (a === 127) || // 127.0.0.0/8
            (a === 0) // 0.0.0.0/8
        ) {
            throw new Error('Private IP addresses are not allowed');
        }
    }
    
    // Block IPv6 private ranges
    if (hostname.includes(':')) {
        if (hostname.startsWith('fc') || hostname.startsWith('fd') || // fc00::/7
            hostname.startsWith('fe80') || // fe80::/10
            hostname === '::1') { // loopback
            throw new Error('Private IPv6 addresses are not allowed');
        }
    }
    
    // Normalize URL: remove auth, fragment, default ports
    url.username = '';
    url.password = '';
    url.hash = '';
    
    // Return normalized URL string
    return url.toString();
}

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
            
            // Validate and sanitize URL to prevent SSRF
            const url = validateAndNormalizeURL(data.url);
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