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
        const net = require('net');
        
        // Check protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        const hostname = urlObj.hostname;
        
        // Check if it's an IP address
        const ipVersion = net.isIP(hostname);
        
        if (ipVersion === 4) {
            // Parse IPv4 octets
            const parts = hostname.split('.').map(Number);
            
            // Check for loopback
            if (parts[0] === 127) {
                winston.warn(`[ogp-embed] Blocked loopback IP: ${hostname}`);
                return false;
            }
            
            // Check RFC1918 private ranges
            // 10.0.0.0/8
            if (parts[0] === 10) {
                winston.warn(`[ogp-embed] Blocked private IP (10.0.0.0/8): ${hostname}`);
                return false;
            }
            
            // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
            if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
                winston.warn(`[ogp-embed] Blocked private IP (172.16.0.0/12): ${hostname}`);
                return false;
            }
            
            // 192.168.0.0/16
            if (parts[0] === 192 && parts[1] === 168) {
                winston.warn(`[ogp-embed] Blocked private IP (192.168.0.0/16): ${hostname}`);
                return false;
            }
        } else if (ipVersion === 6) {
            // Check IPv6 reserved addresses
            const addr = hostname.toLowerCase();
            
            // Loopback ::1
            if (addr === '::1' || addr === '0:0:0:0:0:0:0:1') {
                winston.warn(`[ogp-embed] Blocked IPv6 loopback: ${hostname}`);
                return false;
            }
            
            // ULA (fc00::/7)
            if (addr.startsWith('fc') || addr.startsWith('fd')) {
                winston.warn(`[ogp-embed] Blocked IPv6 ULA: ${hostname}`);
                return false;
            }
            
            // Link-local (fe80::/10)
            if (addr.startsWith('fe8') || addr.startsWith('fe9') || 
                addr.startsWith('fea') || addr.startsWith('feb')) {
                winston.warn(`[ogp-embed] Blocked IPv6 link-local: ${hostname}`);
                return false;
            }
        } else {
            // It's a hostname, not an IP
            // Check for obvious local hostnames
            if (hostname === 'localhost' || hostname.endsWith('.local')) {
                winston.warn(`[ogp-embed] Blocked local hostname: ${hostname}`);
                return false;
            }
            // Note: DNS resolution check would go here for production
            // This would require async validation before fetching
        }
        
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = { parse };