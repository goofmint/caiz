'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const validator = require.main.require('validator');
const benchpress = require.main.require('benchpressjs');
const path = require('path');
const fs = require('fs').promises;

class OGPRenderer {
    constructor() {
        this.baseUrl = nconf.get('url');
        this.templatePath = path.join(__dirname, '../templates/partials/ogp-card.tpl');
        this.templateCache = null;
    }

    /**
     * Load template
     */
    async loadTemplate() {
        if (!this.templateCache) {
            try {
                this.templateCache = await fs.readFile(this.templatePath, 'utf8');
            } catch (err) {
                winston.error(`[ogp-embed] Failed to load template: ${err.message}`);
                return null;
            }
        }
        return this.templateCache;
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
            
            const template = await this.loadTemplate();
            if (!template) {
                return this.renderFallback(ogpData.url);
            }
            
            // Escape HTML to prevent XSS
            const data = {
                url: validator.escape(ogpData.url),
                title: validator.escape(ogpData.title || 'No title'),
                description: ogpData.description ? validator.escape(ogpData.description) : '',
                image: ogpData.image ? validator.escape(ogpData.image) : '',
                siteName: validator.escape(ogpData.siteName || ''),
                domain: validator.escape(ogpData.domain || ''),
                favicon: ogpData.favicon ? validator.escape(ogpData.favicon) : ''
            };
            
            // Use NodeBB's benchpress render method
            try {
                const html = await benchpress.render(template, data);
                return html;
            } catch (compileErr) {
                winston.error(`[ogp-embed] Template compile error: ${compileErr.message}`);
                // Fallback to simple string replacement
                let html = template;
                
                // Handle conditional blocks
                if (data.favicon) {
                    html = html.replace(/<!-- IF favicon -->([\s\S]*?)<!-- ENDIF favicon -->/g, '$1');
                } else {
                    html = html.replace(/<!-- IF favicon -->([\s\S]*?)<!-- ENDIF favicon -->/g, '');
                }
                
                if (data.description) {
                    html = html.replace(/<!-- IF description -->([\s\S]*?)<!-- ENDIF description -->/g, '$1');
                } else {
                    html = html.replace(/<!-- IF description -->([\s\S]*?)<!-- ENDIF description -->/g, '');
                }
                
                if (data.image) {
                    html = html.replace(/<!-- IF image -->([\s\S]*?)<!-- ENDIF image -->/g, '$1');
                } else {
                    html = html.replace(/<!-- IF image -->([\s\S]*?)<!-- ENDIF image -->/g, '');
                }
                
                // Replace variables
                return html
                    .replace(/\{url\}/g, data.url)
                    .replace(/\{title\}/g, data.title)
                    .replace(/\{description\}/g, data.description)
                    .replace(/\{image\}/g, data.image)
                    .replace(/\{domain\}/g, data.domain)
                    .replace(/\{favicon\}/g, data.favicon);
            }
            
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