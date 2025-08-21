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
            
            // Compile and render template
            try {
                const compiled = await benchpress.precompile(template, {});
                const fn = await benchpress.evaluate(compiled);
                const html = fn(data);
                return html;
            } catch (compileErr) {
                winston.error(`[ogp-embed] Template compile error: ${compileErr.message}`);
                // Fallback to simple string replacement
                return template
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