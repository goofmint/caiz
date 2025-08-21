'use strict';

const db = require.main.require('./src/database');
const meta = require.main.require('./src/meta');

class OGPSettings {
    constructor() {
        this.defaults = {
            enabled: true,
            timeout: 5,
            cacheTTL: 24,
            maxDescriptionLength: 200,
            showFavicon: true,
            openInNewTab: true,
            userAgentString: 'Mozilla/5.0 (compatible; NodeBB OGP Embed Bot/1.0)'
        };
    }

    /**
     * Get all settings
     * @returns {Object} Settings object
     */
    async getSettings() {
        try {
            const settings = await meta.settings.get('ogp-embed');
            return { ...this.defaults, ...(settings || {}) };
        } catch (err) {
            return this.defaults;
        }
    }

    /**
     * Save settings
     * @param {Object} settings - Settings to save
     */
    async saveSettings(settings) {
        try {
            await meta.settings.set('ogp-embed', settings);
        } catch (err) {
            throw new Error('Failed to save OGP embed settings');
        }
    }

    /**
     * Get a specific setting value
     * @param {string} key - Setting key
     * @returns {*} Setting value
     */
    async getSetting(key) {
        const settings = await this.getSettings();
        return settings[key];
    }

    /**
     * Check if OGP embed is enabled
     * @returns {boolean}
     */
    async isEnabled() {
        return await this.getSetting('enabled');
    }

    /**
     * Get timeout value in milliseconds
     * @returns {number}
     */
    async getTimeout() {
        const timeout = await this.getSetting('timeout');
        return (timeout || 5) * 1000; // Convert to milliseconds
    }

    /**
     * Get cache TTL in milliseconds
     * @returns {number}
     */
    async getCacheTTL() {
        const ttl = await this.getSetting('cacheTTL');
        return (ttl || 24) * 60 * 60 * 1000; // Convert to milliseconds
    }

}

module.exports = new OGPSettings();