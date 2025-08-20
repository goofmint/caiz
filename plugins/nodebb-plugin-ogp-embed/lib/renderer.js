'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const validator = require.main.require('validator');

class OGPRenderer {
    constructor() {
        this.baseUrl = nconf.get('url');
    }

    /**
     * Render OGP card HTML
     * @param {Object} ogpData
     * @returns {string} HTML
     */
    async render(ogpData) {
        try {
            if (!ogpData || !ogpData.url) {
                return this.renderFallback(ogpData?.url || '#');
            }
            
            // Escape HTML to prevent XSS
            const escaped = {
                url: validator.escape(ogpData.url),
                title: validator.escape(ogpData.title || 'No title'),
                description: validator.escape(ogpData.description || ''),
                image: ogpData.image ? validator.escape(ogpData.image) : '',
                siteName: validator.escape(ogpData.siteName || ''),
                domain: validator.escape(ogpData.domain || ''),
                favicon: validator.escape(ogpData.favicon || '')
            };
            
            // Build HTML using template-like structure
            let html = `<div class="ogp-card" data-url="${escaped.url}">`;
            
            // Add image if available
            if (escaped.image) {
                html += `
                    <div class="ogp-card-image">
                        <img src="${escaped.image}" alt="${escaped.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                    </div>`;
            }
            
            // Add content
            html += `
                <div class="ogp-card-content">
                    <div class="ogp-card-title">
                        <a href="${escaped.url}" target="_blank" rel="noopener noreferrer">
                            ${escaped.title}
                        </a>
                    </div>`;
            
            // Add description if available
            if (escaped.description) {
                html += `
                    <div class="ogp-card-description">
                        ${escaped.description}
                    </div>`;
            }
            
            // Add domain info
            html += `
                    <div class="ogp-card-domain">`;
            
            if (escaped.favicon) {
                html += `<img src="${escaped.favicon}" alt="" class="ogp-card-favicon" onerror="this.style.display='none'">`;
            }
            
            html += `
                        <span>${escaped.domain}</span>
                    </div>
                </div>
            </div>`;
            
            return html;
            
        } catch (err) {
            winston.error(`[ogp-embed] Render error: ${err.message}`);
            return this.renderFallback(ogpData?.url || '#');
        }
    }

    /**
     * Render fallback display
     * @param {string} url
     * @returns {string} HTML
     */
    renderFallback(url) {
        const escaped = validator.escape(url);
        return `<div class="ogp-card-fallback">
            <a href="${escaped}" target="_blank" rel="noopener noreferrer">${escaped}</a>
        </div>`;
    }

    /**
     * Render placeholder
     * @param {string} url
     * @returns {string} HTML
     */
    renderPlaceholder(url) {
        const escaped = validator.escape(url);
        return `<div class="ogp-card-placeholder" data-ogp-url="${escaped}">
            <div class="ogp-card-loading">
                <span class="spinner-border spinner-border-sm" role="status"></span>
                Loading preview...
            </div>
            <noscript>
                <a href="${escaped}" target="_blank" rel="noopener noreferrer">${escaped}</a>
            </noscript>
        </div>`;
    }
}

module.exports = new OGPRenderer();