'use strict';

const db = require.main.require('./src/database');
const winston = require.main.require('winston');

const DEFAULT_SETTINGS = {
    prompts: {
        systemPrompt: [
            'You are a professional translator.',
            'Task: Translate the provided Markdown content into multiple languages while strictly preserving formatting.',
            '',
            'Strict requirements:',
            '- Preserve Markdown syntax exactly (headings, lists, code blocks, inline code, emphasis).',
            '- Do not change, remove, or rewrite any URLs (links, images, embeds). Keep href/src targets exactly as-is.',
            '- Do not wrap the output in code fences. Return JSON only.',
            '- Do not add commentary or extra fields.',
            '',
            'Output format (JSON object with exactly these keys, values are Markdown):',
            '{supportedLanguages}',
            '',
            'Content to translate (Markdown):',
            '{content}'
        ].join('\n')
    },
    api: {
        geminiApiKey: ''
    }
};

class SettingsManager {
    constructor() {
        this.settingsKey = 'auto-translate:settings';
        this.settings = null;
    }
    
    /**
     * Initialize settings - load from database or use defaults
     */
    async init() {
        try {
            const savedSettings = await db.getObject(this.settingsKey);
            if (savedSettings && Object.keys(savedSettings).length > 0) {
                // Use exactly what is stored (no runtime fallback/merge)
                this.settings = savedSettings;
            } else {
                // First-time initialization only: persist defaults
                this.settings = DEFAULT_SETTINGS;
                await db.setObject(this.settingsKey, this.settings);
            }
            winston.info('[auto-translate] Settings initialized');
        } catch (err) {
            winston.error('[auto-translate] Failed to initialize settings:', err);
            // Do not fallback at runtime; surface empty settings to callers
            this.settings = {};
        }
    }
    
    /**
     * Get current settings
     */
    async getSettings() {
        if (!this.settings) {
            await this.init();
        }
        // Don't expose the API key in full
        const settings = JSON.parse(JSON.stringify(this.settings));
        if (settings.api.geminiApiKey) {
            settings.api.geminiApiKey = this.maskApiKey(settings.api.geminiApiKey);
        }
        return settings;
    }
    
    /**
     * Save settings to database
     */
    async saveSettings(settings) {
        try {
            await this.validateSettings(settings);
            if (!this.settings) {
                await this.init();
            }

            // Merge into current stored settings only (no DEFAULT merge)
            const mergedSettings = this.mergeObjects(this.settings || {}, settings);

            // Preserve existing API key if not explicitly provided
            const hasApi = settings && settings.api && Object.prototype.hasOwnProperty.call(settings.api, 'geminiApiKey');
            if (!hasApi && this.settings && this.settings.api && this.settings.api.geminiApiKey) {
                mergedSettings.api = mergedSettings.api || {};
                mergedSettings.api.geminiApiKey = this.settings.api.geminiApiKey;
            }

            this.settings = mergedSettings;
            await db.setObject(this.settingsKey, this.settings);
            winston.info('[auto-translate] Settings saved successfully');
            return true;
        } catch (err) {
            winston.error('[auto-translate] Failed to save settings:', err);
            throw err;
        }
    }
    
    /**
     * Validate settings
     */
    async validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            throw new Error('Invalid settings object');
        }
        
        return true;
    }
    
    /**
     * Get raw settings (with unmasked API key)
     */
    async getRawSettings() {
        if (!this.settings) {
            await this.init();
        }
        return this.settings;
    }
    
    /**
     * Merge settings with defaults
     */
    mergeObjects(base, patch) {
        const merged = JSON.parse(JSON.stringify(base || {}));
        Object.keys(patch || {}).forEach(key => {
            const value = patch[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                merged[key] = this.mergeObjects(merged[key] || {}, value);
            } else {
                merged[key] = value;
            }
        });
        return merged;
    }
    
    /**
     * Mask API key for display
     */
    maskApiKey(apiKey) {
        if (!apiKey || apiKey.length < 8) {
            return apiKey;
        }
        return apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4);
    }
    
    /**
     * Check if API key is masked
     */
    isMaskedApiKey(apiKey) {
        return apiKey && apiKey.includes('****');
    }
}

module.exports = SettingsManager;
