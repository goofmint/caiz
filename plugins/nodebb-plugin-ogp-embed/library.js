'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const parser = require('./lib/parser');
const cache = require('./lib/cache');
const renderer = require('./lib/renderer');
const rulesManager = require('./lib/rules/manager');
const regexProcessor = require('./lib/rules/processor');
const adminRules = require('./lib/admin/rules');
const clientSockets = require('./lib/client/sockets');
const utils = require('./lib/rules/utils');

const plugin = {};
const baseUrl = nconf.get('url');

// Common URL pattern
const URL_PATTERN = `https?:\\/\\/[^"\\s]+`;

/**
 * Extract URLs from raw text content (for onPostSave)
 * @param {string} content - Raw text content
 * @returns {string[]} Array of URLs found
 */
function extractURLsFromRawText(content) {
    const urlRegex = new RegExp(URL_PATTERN, 'gi');
    const urls = content.match(urlRegex) || [];
    winston.info(`[ogp-embed] Raw text content (first 500 chars): ${content.substring(0, 500)}`);
    winston.info(`[ogp-embed] Extracted ${urls.length} URLs from raw text: ${urls.join(', ')}`);
    return urls;
}

/**
 * Extract URLs from HTML content (for parsePost)
 * @param {string} content - HTML content
 * @returns {string[]} Array of URLs found  
 */
function extractURLsFromHTML(content) {
    const results = [];
    const seen = new Set();
    // Match links in paragraphs (with or without closing </p>, and with possible <br /> tags)
    const linkRegex = new RegExp(`<p[^>]*>\\s*<a\\s+href="(${URL_PATTERN})"[^>]*>[^<]*<\\/a>(?:\\s*<br\\s*\\/?>)?(?:\\s*<\\/p>)?`, 'gi');
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const posKey = `${match.index}:${fullMatch.length}`;
        if (seen.has(posKey)) continue;
        const url = match[1];
        results.push({ type: 'link-alone', fullMatch, url });
        seen.add(posKey);
    }
    
    // Also support: <p>some text<br> <a href="URL">URL</a></p>
    try {
        const linkWithPrefixRegex = new RegExp(`<p([^>]*)>\\s*([\\s\\S]*?)<br\\s*\\/?>\\s*<a\\s+href="(${URL_PATTERN})"[^>]*>[^<]*<\\/a>\\s*<\\/p>`, 'gi');
        while ((match = linkWithPrefixRegex.exec(content)) !== null) {
            const fullMatch = match[0];
            const posKey = `${match.index}:${fullMatch.length}`;
            if (seen.has(posKey)) continue;
            const pAttrs = match[1] || '';
            const prefixHtml = match[2] || '';
            const url = match[3];
            results.push({ type: 'prefix', fullMatch, url, pAttrs, prefixHtml });
            seen.add(posKey);
        }
    } catch (e) {
        winston.warn('[ogp-embed] linkWithPrefixRegex failed:', e.message);
    }

    // Generic: <p> ... (prefix) ... <a href="URL"> ... </a> ... (suffix) ... </p>
    try {
        const genericInParagraphRegex = new RegExp(`<p([^>]*)>\\s*([\\s\\S]*?)<a\\s+href=\"(${URL_PATTERN})\"[^>]*>[^<]*<\\/a>([\\s\\S]*?)<\\/p>`, 'gi');
        while ((match = genericInParagraphRegex.exec(content)) !== null) {
            const fullMatch = match[0];
            const posKey = `${match.index}:${fullMatch.length}`;
            if (seen.has(posKey)) continue;
            const pAttrs = match[1] || '';
            const prefixHtml = match[2] || '';
            const url = match[3];
            const suffixHtml = match[4] || '';
            results.push({ type: 'prefix-suffix', fullMatch, url, pAttrs, prefixHtml, suffixHtml });
            seen.add(posKey);
        }
    } catch (e) {
        winston.warn('[ogp-embed] genericInParagraphRegex failed:', e.message);
    }

    winston.info(`[ogp-embed] Extracted ${results.length} URLs from HTML: ${results.map(r => r.url).join(', ')}`);
    return results;
}

/**
 * Plugin initialization
 */
plugin.onLoad = async function(params) {
    const { router, middleware } = params;
    
    winston.info('[ogp-embed] Plugin loaded');
    winston.info('[ogp-embed] Available methods:', Object.keys(plugin));
    
    // Initialize components
    await cache.initialize();
    await rulesManager.initialize();
    
    // Initialize admin module
    adminRules.init(params);
    
    // Setup admin routes
    if (router && middleware) {
        router.get('/admin/plugins/ogp-embed/rules', middleware.admin.buildHeader, renderAdminPage);
        router.get('/api/admin/plugins/ogp-embed/rules', middleware.admin.buildHeader, renderAdminPage);
        winston.info('[ogp-embed] Admin routes registered');
    }
    
    // Register socket handlers
    const socketPlugins = require.main.require('./src/socket.io/plugins');
    adminRules.registerSockets(socketPlugins);
    clientSockets.registerSockets(socketPlugins);
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
    const urls = extractURLsFromRawText(content);
    
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
 * Render admin page
 */
function renderAdminPage(req, res) {
    res.render('admin/plugins/ogp-embed/rules', {
        title: 'OGP Embed Rules'
    });
}

/**
 * Parse post content and embed OGP cards
 */
plugin.parsePost = async function(hookData) {
    winston.info('[ogp-embed] parsePost called');
    
    if (!hookData || !hookData.postData || !hookData.postData.content) {
        winston.info('[ogp-embed] parsePost: No content found');
        return hookData;
    }
    
    const content = hookData.postData.content;
    winston.info(`[ogp-embed] parsePost: Processing content with ${content.length} characters`);
    
    winston.info(`[ogp-embed] Looking for URLs in HTML content: ${content.substring(0, 500)}...`);
    
    // Extract URLs using helper function
    const urlResults = extractURLsFromHTML(content);
    let processedContent = content;
    
    for (const item of urlResults) {
        const { fullMatch, url } = item;
        winston.info(`[ogp-embed] Found URL for processing: ${url}`);
        
        try {
            // First, try regex rules
            winston.info(`[ogp-embed] Trying regex rules for: ${url}`);
            const regexResult = await regexProcessor.processURL(url);
            
            if (regexResult) {
                // Regex rule matched, use the result
                processedContent = processedContent.replace(fullMatch, regexResult);
                winston.info(`[ogp-embed] Applied regex rule for URL: ${url}`);
            } else {
                // No regex rule matched, fall back to OGP
                winston.info(`[ogp-embed] No regex rule matched, trying OGP for: ${url}`);
                const ogpData = await cache.get(url);
                
                if (ogpData && ogpData.title) {
                    winston.info(`[ogp-embed] Found OGP data for: ${url}`);
                    const cardHtml = await renderer.render(ogpData);
                    if (item.type === 'prefix') {
                        const openP = `<p${item.pAttrs}>`;
                        const prefixPart = `${openP}${item.prefixHtml}</p>`;
                        processedContent = processedContent.replace(fullMatch, `${prefixPart}\n${cardHtml}`);
                    } else if (item.type === 'prefix-suffix') {
                        const openP = `<p${item.pAttrs}>`;
                        const prefixPart = item.prefixHtml ? `${openP}${item.prefixHtml}</p>` : '';
                        // strip id attribute from suffix attrs
                        const suffixAttrs = String(item.pAttrs || '').replace(/\s+id\s*=\s*(".*?"|'.*?')/i, '');
                        const openSuffixP = `<p${suffixAttrs}>`;
                        const suffixPart = item.suffixHtml ? `${openSuffixP}${item.suffixHtml}</p>` : '';
                        const combined = [prefixPart, cardHtml, suffixPart].filter(Boolean).join('\n');
                        processedContent = processedContent.replace(fullMatch, combined);
                    } else {
                        processedContent = processedContent.replace(fullMatch, cardHtml);
                    }
                    winston.info(`[ogp-embed] Replaced URL with OGP card: ${url}`);
                } else {
                    // No OGP data in cache, output placeholder for async loading
                    winston.info(`[ogp-embed] No OGP data found, outputting placeholder for: ${url}`);
                    const placeholderHtml = `<div class="ogp-card-placeholder" data-ogp-url="${utils.escape(url)}">
                        <div class="ogp-loading">
                            <i class="fa fa-spinner fa-spin"></i> Loading preview...
                        </div>
                    </div>`;
                    if (item.type === 'prefix') {
                        const openP = `<p${item.pAttrs}>`;
                        const prefixPart = `${openP}${item.prefixHtml}</p>`;
                        processedContent = processedContent.replace(fullMatch, `${prefixPart}\n${placeholderHtml}`);
                    } else if (item.type === 'prefix-suffix') {
                        const openP = `<p${item.pAttrs}>`;
                        const prefixPart = item.prefixHtml ? `${openP}${item.prefixHtml}</p>` : '';
                        // strip id attribute from suffix attrs
                        const suffixAttrs = String(item.pAttrs || '').replace(/\s+id\s*=\s*(".*?"|'.*?')/i, '');
                        const openSuffixP = `<p${suffixAttrs}>`;
                        const suffixPart = item.suffixHtml ? `${openSuffixP}${item.suffixHtml}</p>` : '';
                        const combined = [prefixPart, placeholderHtml, suffixPart].filter(Boolean).join('\n');
                        processedContent = processedContent.replace(fullMatch, combined);
                    } else {
                        processedContent = processedContent.replace(fullMatch, placeholderHtml);
                    }
                    winston.info(`[ogp-embed] Replaced URL with placeholder: ${url}`);
                }
            }
        } catch (err) {
            winston.error(`[ogp-embed] Error processing URL ${url}: ${err.message}`);
            winston.error(`[ogp-embed] Stack trace: ${err.stack}`);
        }
    }
    
    hookData.postData.content = processedContent;
    return hookData;
};


/**
 * Add admin navigation menu
 */
plugin.addAdminNavigation = function(header, callback) {
    header.plugins.push({
        route: '/plugins/ogp-embed/rules',
        icon: 'fa-link',
        name: 'OGP Embed Rules'
    });

    callback(null, header);
};


plugin.hooks = {
    filters: {
        parsePost: plugin.parsePost
    }
};

module.exports = plugin;
