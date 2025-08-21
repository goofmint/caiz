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
            
            // Prepare raw data for Benchpress (it handles escaping automatically)
            const rawData = {
                url: ogpData.url,
                title: ogpData.title || 'No title',
                description: ogpData.description || '',
                image: ogpData.image || '',
                siteName: ogpData.siteName || '',
                domain: ogpData.domain || '',
                favicon: ogpData.favicon || ''
            };
            
            // Use Benchpress compileRender for raw template strings
            try {
                const html = await benchpress.compileRender(template, rawData);
                return html;
            } catch (compileErr) {
                winston.error(`[ogp-embed] Template compile error: ${compileErr.message}`);
                
                // Fallback: manually escape data for string replacement
                const escapedData = {
                    url: validator.escape(rawData.url),
                    title: validator.escape(rawData.title),
                    description: validator.escape(rawData.description),
                    image: validator.escape(rawData.image),
                    siteName: validator.escape(rawData.siteName),
                    domain: validator.escape(rawData.domain),
                    favicon: validator.escape(rawData.favicon)
                };
                
                let html = template;
                
                // Handle conditional blocks
                if (rawData.favicon) {
                    html = html.replace(/<!-- IF favicon -->([\s\S]*?)<!-- ENDIF favicon -->/g, '$1');
                } else {
                    html = html.replace(/<!-- IF favicon -->([\s\S]*?)<!-- ENDIF favicon -->/g, '');
                }
                
                if (rawData.description) {
                    html = html.replace(/<!-- IF description -->([\s\S]*?)<!-- ENDIF description -->/g, '$1');
                } else {
                    html = html.replace(/<!-- IF description -->([\s\S]*?)<!-- ENDIF description -->/g, '');
                }
                
                if (rawData.image) {
                    html = html.replace(/<!-- IF image -->([\s\S]*?)<!-- ENDIF image -->/g, '$1');
                } else {
                    html = html.replace(/<!-- IF image -->([\s\S]*?)<!-- ENDIF image -->/g, '');
                }
                
                // Replace variables with escaped values
                return html
                    .replace(/\{url\}/g, escapedData.url)
                    .replace(/\{title\}/g, escapedData.title)
                    .replace(/\{description\}/g, escapedData.description)
                    .replace(/\{image\}/g, escapedData.image)
                    .replace(/\{domain\}/g, escapedData.domain)
                    .replace(/\{favicon\}/g, escapedData.favicon);
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