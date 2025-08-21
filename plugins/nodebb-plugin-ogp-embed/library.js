'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const parser = require('./lib/parser');
const cache = require('./lib/cache');
const renderer = require('./lib/renderer');

const plugin = {};
const baseUrl = nconf.get('url');

// URL detection regex - improved pattern
const URL_REGEX = /https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w._~!$&'()*+,;=:@]|%[\da-f]{2})*)*(?:\?(?:[\w._~!$&'()*+,;=:@/?]|%[\da-f]{2})*)?(?:#(?:[\w._~!$&'()*+,;=:@/?]|%[\da-f]{2})*)?/gi;

/**
 * Plugin initialization
 */
plugin.onLoad = async function(params) {
    winston.info('[ogp-embed] Plugin loaded');
    winston.info('[ogp-embed] Available methods:', Object.keys(plugin));
    
    // Initialize cache
    await cache.initialize();
};

/**
 * Handle post save with concurrency limits
 */
plugin.onPostSave = async function(data) {
    winston.info('[ogp-embed] onPostSave called');
    
    if (!data || !data.post || !data.post.content) {
        winston.info('[ogp-embed] No content in post data');
        return;
    }
    
    const content = data.post.content;
    const urls = content.match(URL_REGEX);
    
    if (urls && urls.length > 0) {
        winston.info(`[ogp-embed] Found ${urls.length} URLs`);
        
        // Limit concurrent processing to avoid overwhelming the system
        const MAX_CONCURRENT = 3;
        const chunks = [];
        for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
            chunks.push(urls.slice(i, i + MAX_CONCURRENT));
        }
        
        for (const chunk of chunks) {
            const promises = chunk.map(async (url) => {
                try {
                    const ogpData = await parser.parse(url);
                    if (ogpData) {
                        await cache.set(url, ogpData);
                        winston.info(`[ogp-embed] Cached OGP data for: ${url}`);
                    }
                } catch (err) {
                    winston.error(`[ogp-embed] Error parsing URL ${url}: ${err.message}`);
                }
            });
            
            await Promise.all(promises);
        }
    }
};


/**
 * Parse post content and embed OGP cards
 */
plugin.parsePost = async function(hookData) {
    if (!hookData || !hookData.postData || !hookData.postData.content) {
        return hookData;
    }
    
    const content = hookData.postData.content;
    
    // Match standalone link paragraphs with any attributes: <p dir="auto"><a href="url">url</a></p>
    const linkRegex = /<p[^>]*>\s*<a\s+href="(https?:\/\/[^"]+)"[^>]*>[^<]*<\/a>\s*<\/p>/gi;
    let processedContent = content;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const url = match[1];
        
        try {
            const ogpData = await cache.get(url);
            
            if (ogpData && ogpData.title) {
                const cardHtml = await renderer.render(ogpData);
                processedContent = processedContent.replace(fullMatch, cardHtml);
                winston.info(`[ogp-embed] Replaced URL with OGP card: ${url}`);
            }
        } catch (err) {
            winston.error(`[ogp-embed] Error processing URL ${url}: ${err.message}`);
        }
    }
    
    hookData.postData.content = processedContent;
    return hookData;
};


plugin.hooks = {
    filters: {
        parsePost: plugin.parsePost
    }
};

module.exports = plugin;