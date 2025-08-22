'use strict';

const db = require.main.require('./src/database');
const winston = require.main.require('winston');

const DEFAULT_SETTINGS = {
    prompts: {
        systemPrompt: 'You are a professional translator. Translate the following content accurately while preserving the original meaning and context.',
        translationInstruction: 'Translate to {{targetLang}} from {{sourceLang}}. Maintain formatting, code blocks, and markdown syntax.',
        contextPreservation: 'Preserve technical terms, product names, and proper nouns appropriately.',
        outputFormat: 'Return only the translated text without any explanations or notes.'
    },
    api: {
        geminiApiKey: '',
        model: 'gemini-pro',
        maxTokens: 2048,
        temperature: 0.3,
        timeout: 30
    },
    languages: {
        supportedLanguages: ["en","ja","zh-CN","es","fr","de","ko"],
        defaultLanguage: 'en',
        autoDetection: true
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
            
            // If API key is masked, preserve the existing one
            if (settings.api && settings.api.geminiApiKey) {
                if (this.isMaskedApiKey(settings.api.geminiApiKey)) {
                    settings.api.geminiApiKey = this.settings.api.geminiApiKey;
                }
            }
            
            // Merge with defaults to ensure all fields exist
            this.settings = this.mergeSettings(DEFAULT_SETTINGS, settings);
            
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
        
        // Validate API settings
        if (settings.api) {
            if (settings.api.maxTokens && (settings.api.maxTokens < 1 || settings.api.maxTokens > 8192)) {
                throw new Error('Max tokens must be between 1 and 8192');
            }
            
            if (settings.api.temperature && (settings.api.temperature < 0 || settings.api.temperature > 2)) {
                throw new Error('Temperature must be between 0 and 2');
            }
            
            if (settings.api.timeout && (settings.api.timeout < 1 || settings.api.timeout > 300)) {
                throw new Error('Timeout must be between 1 and 300 seconds');
            }
        }
        
        // Validate language settings
        if (settings.languages) {
            if (settings.languages.supportedLanguages && !Array.isArray(settings.languages.supportedLanguages)) {
                throw new Error('Supported languages must be an array');
            }
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