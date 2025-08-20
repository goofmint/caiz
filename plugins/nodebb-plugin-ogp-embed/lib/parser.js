'use strict';

const winston = require.main.require('winston');
const ogpParser = require('ogp-parser');
const settings = require('./settings');

/**
 * Parse OGP metadata from URL
 * @param {string} url - Target URL
 * @returns {Object|null} OGP data
 */
async function parse(url) {
    try {
        // Check if plugin is enabled
        const isEnabled = await settings.isEnabled();
        if (!isEnabled) {
            return null;
        }

        // Validate URL
        if (!validateUrl(url)) {
            winston.warn(`[ogp-embed] Invalid URL: ${url}`);
            return null;
        }

        
        winston.info(`[ogp-embed] Parsing OGP for: ${url}`);
        
        // Use ogp-parser directly
        const data = await ogpParser(url);
        
        if (!data) {
            winston.warn(`[ogp-embed] No OGP data found for: ${url}`);
            return null;
        }
        
        // Extract and normalize OGP data
        const maxDescLength = await settings.getSetting('maxDescriptionLength') || 200;
        const normalized = normalizeOGPData(data, url, maxDescLength);
        
        winston.info(`[ogp-embed] Successfully parsed OGP for: ${url}`);
        return normalized;
        
    } catch (err) {
        winston.error(`[ogp-embed] Parser error for ${url}: ${err.message}`);
        return null;
    }
}

/**
 * Normalize OGP data structure
 * @param {Object} data - Raw OGP data from ogp-parser
 * @param {string} url - Original URL
 * @param {number} maxDescLength - Maximum description length
 * @returns {Object} Normalized data
 */
function normalizeOGPData(data, url, maxDescLength = 200) {
    const ogp = data.ogp || {};
    
    // Extract domain from URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Build normalized structure using ogp-parser output format
    const normalized = {
        url: url,
        title: data.title || '',
        description: ogp['og:description'] ? ogp['og:description'][0] : '',
        image: ogp['og:image'] ? ogp['og:image'][0] : null,
        siteName: ogp['og:site_name'] ? ogp['og:site_name'][0] : domain,
        domain: domain,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        type: ogp['og:type'] ? ogp['og:type'][0] : 'website'
    };
    
    // Clean up description
    if (normalized.description) {
        normalized.description = normalized.description
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Truncate if too long
        if (normalized.description.length > maxDescLength) {
            normalized.description = normalized.description.substring(0, maxDescLength - 3) + '...';
        }
    }
    
    // Ensure absolute image URL
    if (normalized.image && !normalized.image.startsWith('http')) {
        try {
            const imageUrl = new URL(normalized.image, url);
            normalized.image = imageUrl.href;
        } catch (err) {
            winston.warn(`[ogp-embed] Invalid image URL: ${normalized.image}`);
            normalized.image = null;
        }
    }
    
    return normalized;
}

/**
 * Validate URL
 * @param {string} url
 * @returns {boolean}
 */
function validateUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // Check protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        // Check for private IPs (basic SSRF protection)
        const hostname = urlObj.hostname;
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.')) {
            winston.warn(`[ogp-embed] Blocked private IP: ${hostname}`);
            return false;
        }
        
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = { parse };