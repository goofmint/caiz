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
            userAgentString: 'Mozilla/5.0 (compatible; NodeBB OGP Embed Bot/1.0)',
            whitelist: '',
            blacklist: ''
        };
    }

    /**
     * Get all settings
     * @returns {Object} Settings object
     */
    async getSettings() {
        try {
            const settings = await meta.settings.get('ogp-embed');
            return { ...this.defaults, ...settings };
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

    /**
     * Get domain whitelist as array
     * @returns {Array}
     */
    async getWhitelist() {
        const whitelist = await this.getSetting('whitelist');
        return whitelist ? whitelist.split('\n').map(d => d.trim()).filter(Boolean) : [];
    }

    /**
     * Get domain blacklist as array
     * @returns {Array}
     */
    async getBlacklist() {
        const blacklist = await this.getSetting('blacklist');
        return blacklist ? blacklist.split('\n').map(d => d.trim()).filter(Boolean) : [];
    }

    /**
     * Check if domain is allowed
     * @param {string} domain
     * @returns {boolean}
     */
    async isDomainAllowed(domain) {
        const whitelist = await this.getWhitelist();
        const blacklist = await this.getBlacklist();

        // Check blacklist first
        if (blacklist.length > 0) {
            for (const blocked of blacklist) {
                if (domain.includes(blocked)) {
                    return false;
                }
            }
        }

        // Check whitelist if it exists
        if (whitelist.length > 0) {
            for (const allowed of whitelist) {
                if (domain.includes(allowed)) {
                    return true;
                }
            }
            return false; // Not in whitelist
        }

        return true; // No whitelist, domain is allowed
    }
}

module.exports = new OGPSettings();