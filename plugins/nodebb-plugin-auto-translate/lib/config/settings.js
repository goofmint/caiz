'use strict';

const db = require.main.require('./src/database');
const winston = require.main.require('winston');

const DEFAULT_SETTINGS = {
    prompts: {
        systemPrompt: 'You are a professional translator. Translate the following content accurately while preserving the original meaning and context.'
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
            if (savedSettings) {
                this.settings = this.mergeSettings(DEFAULT_SETTINGS, savedSettings);
            } else {
                this.settings = DEFAULT_SETTINGS;
                await this.saveSettings(this.settings);
            }
            winston.info('[auto-translate] Settings initialized');
        } catch (err) {
            winston.error('[auto-translate] Failed to initialize settings:', err);
            this.settings = DEFAULT_SETTINGS;
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
            // Validate settings
            await this.validateSettings(settings);
            
            // Merge with existing settings, preserving API key if not provided
            const mergedSettings = this.mergeSettings(this.settings || DEFAULT_SETTINGS, settings);
            
            // If no API key provided in new settings, keep the existing one
            if (!settings.api || !settings.api.geminiApiKey) {
                if (this.settings && this.settings.api && this.settings.api.geminiApiKey) {
                    mergedSettings.api = mergedSettings.api || {};
                    mergedSettings.api.geminiApiKey = this.settings.api.geminiApiKey;
                }
            }
            
            this.settings = mergedSettings;
            
            // Save to database
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
    mergeSettings(defaults, settings) {
        const merged = JSON.parse(JSON.stringify(defaults));
        
        // Deep merge
        Object.keys(settings).forEach(key => {
            if (typeof settings[key] === 'object' && !Array.isArray(settings[key])) {
                merged[key] = { ...merged[key], ...settings[key] };
            } else {
                merged[key] = settings[key];
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