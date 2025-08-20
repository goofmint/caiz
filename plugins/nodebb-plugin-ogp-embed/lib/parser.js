'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const fetch = require('node-fetch');
const ogpParser = require('ogp-parser');
const settings = require('./settings');

class OGPParser {
    constructor() {
        this.timeout = 5000; // 5 seconds default timeout
        this.userAgent = 'Mozilla/5.0 (compatible; NodeBB OGP Embed Bot/1.0)';
    }

    /**
     * Parse OGP metadata from URL
     * @param {string} url - Target URL
     * @returns {Object|null} OGP data
     */
    async parse(url) {
        try {
            // Check if plugin is enabled
            const isEnabled = await settings.isEnabled();
            if (!isEnabled) {
                return null;
            }

            // Validate URL
            if (!this.validateUrl(url)) {
                winston.warn(`[ogp-embed] Invalid URL: ${url}`);
                return null;
            }

            // Check domain whitelist/blacklist
            const urlObj = new URL(url);
            const isDomainAllowed = await settings.isDomainAllowed(urlObj.hostname);
            if (!isDomainAllowed) {
                winston.warn(`[ogp-embed] Domain not allowed: ${urlObj.hostname}`);
                return null;
            }
            
            winston.info(`[ogp-embed] Parsing OGP for: ${url}`);
            
            // Get settings
            const timeout = await settings.getTimeout();
            const userAgent = await settings.getSetting('userAgentString') || this.userAgent;
            
            // Use ogp-parser to fetch and parse
            const data = await ogpParser(url, {
                timeout: timeout,
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            
            if (!data) {
                winston.warn(`[ogp-embed] No OGP data found for: ${url}`);
                return null;
            }
            
            // Extract and normalize OGP data
            const maxDescLength = await settings.getSetting('maxDescriptionLength') || 200;
            const normalized = this.normalizeOGPData(data, url, maxDescLength);
            
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
     * @returns {Object} Normalized data
     */
    normalizeOGPData(data, url, maxDescLength = 200) {
        const ogp = data.ogp || {};
        const seo = data.seo || {};
        
        // Extract domain from URL
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // Build normalized structure
        const normalized = {
            url: url,
            title: ogp['og:title'] ? ogp['og:title'][0] : (data.title || ''),
            description: ogp['og:description'] ? ogp['og:description'][0] : (seo.description ? seo.description[0] : ''),
            image: ogp['og:image'] ? ogp['og:image'][0] : null,
            siteName: ogp['og:site_name'] ? ogp['og:site_name'][0] : domain,
            domain: domain,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            type: ogp['og:type'] ? ogp['og:type'][0] : 'website'
        };
        
        // Handle Twitter Card as fallback
        if (!normalized.title && data.twitter) {
            normalized.title = data.twitter['twitter:title'] ? data.twitter['twitter:title'][0] : '';
        }
        if (!normalized.description && data.twitter) {
            normalized.description = data.twitter['twitter:description'] ? data.twitter['twitter:description'][0] : '';
        }
        if (!normalized.image && data.twitter) {
            normalized.image = data.twitter['twitter:image'] ? data.twitter['twitter:image'][0] : '';
        }
        
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
    validateUrl(url) {
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
}

module.exports = new OGPParser();