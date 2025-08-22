'use strict';

const winston = require.main.require('winston');
const { GoogleGenAI, Type } = require('@google/genai');

// 対応言語キー（プロンプトマネージャーと一致）
const LANG_KEYS = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                   "id","de","ja","fil","tr","ko","fa","sw","ha","it"];

class GeminiApiClient {
    constructor() {
        this.client = null;
        this.defaultSettings = {
            model: 'gemini-2.5-flash',
            maxTokens: 32768, // Increased for multi-language translations
            temperature: 0.3,
            timeout: 120 // Increased timeout for larger responses
        };
    }
    
    /**
     * Initialize API client with settings
     */
    initialize(settings) {
        if (!settings?.api?.geminiApiKey) {
            throw new Error('Gemini API key is required');
        }
        
        try {
            this.client = new GoogleGenAI({apiKey: settings.api.geminiApiKey});
            
            winston.info('[auto-translate] Gemini API client initialized');
        } catch (err) {
            winston.error('[auto-translate] Failed to initialize Gemini API client:', err);
            throw err;
        }
    }
    
    /**
     * Test API connection
     */
    async testConnection(apiKey) {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        try {
            const ai = new GoogleGenAI({apiKey: apiKey});
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Hello'
            });
            
            // Check proper response structure
            if (response.candidates && response.candidates.length > 0 &&
                response.candidates[0].content && response.candidates[0].content.parts &&
                response.candidates[0].content.parts.length > 0) {
                
                const text = response.candidates[0].content.parts[0].text;
                if (text) {
                    winston.info('[auto-translate] API connection test successful');
                    return { 
                        success: true,
                        message: 'API connection successful'
                    };
                }
            }
            
            throw new Error('Failed to connect to Gemini API');
        } catch (err) {
            winston.error('[auto-translate] Error testing connection:', err);
            throw new Error('Invalid API key or connection failed');
        }
    }
    
    /**
     * Translate content to multiple languages using Gemini API
     */
    async translateContent(prompt, settings = {}) {
        if (!this.client) {
            throw new Error('API client not initialized');
        }
        
        try {
            const apiSettings = { ...this.defaultSettings, ...settings.api };
            const timeoutMs = (apiSettings.timeout || 60) * 1000;
            
            const result = await Promise.race([
                this.client.models.generateContent({
                    model: apiSettings.model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: Object.fromEntries(
                                LANG_KEYS.map(k => [k, { type: Type.STRING }])
                            ),
                            propertyOrdering: LANG_KEYS,
                        },
                        maxOutputTokens: apiSettings.maxTokens,
                        temperature: apiSettings.temperature
                    },
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Translation timeout')), timeoutMs)
                )
            ]);
            
            if (!result.candidates || result.candidates.length === 0) {
                throw new Error('No response from API');
            }
            
            const responseText = result.candidates[0].content.parts[0].text;
            if (!responseText) {
                throw new Error('Empty response from API');
            }
            
            // Parse JSON response
            let translations;
            try {
                translations = JSON.parse(responseText);
            } catch (parseErr) {
                winston.error('[auto-translate] Failed to parse JSON response:', {
                    error: parseErr.message,
                    responseLength: responseText.length,
                    responsePreview: responseText.substring(0, 200) + '...',
                    responseSuffix: responseText.substring(responseText.length - 100)
                });
                
                // Try to detect and fix incomplete JSON
                if (parseErr.message.includes('Unterminated string')) {
                    winston.warn('[auto-translate] Detected incomplete JSON response, content may be too large for API');
                }
                
                throw new Error('Invalid JSON response from API');
            }
            
            // Validate response structure
            if (typeof translations !== 'object' || !translations) {
                throw new Error('Invalid translation response format');
            }
            
            winston.verbose('[auto-translate] Multi-language translation successful:', {
                inputLength: prompt.length,
                languageCount: Object.keys(translations).length
            });
            
            return {
                success: true,
                translations: translations,
                usage: {
                    promptTokens: this.estimateTokens(prompt),
                    completionTokens: this.estimateTokens(responseText)
                }
            };
        } catch (err) {
            winston.error('[auto-translate] Translation failed:', err);
            
            let errorMessage = 'Translation failed';
            if (err.message.includes('timeout')) {
                errorMessage = 'Translation timeout';
            } else if (err.message.includes('SAFETY')) {
                errorMessage = 'Content blocked by safety filters';
            } else if (err.message.includes('QUOTA_EXCEEDED')) {
                errorMessage = 'API quota exceeded';
            } else if (err.message.includes('JSON')) {
                errorMessage = 'Invalid response format';
            }
            
            return {
                success: false,
                error: errorMessage,
                details: err.message
            };
        }
    }
    
    /**
     * Estimate token count (rough approximation)
     */
    estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters for English, 2-3 for Japanese
        const chars = text.length;
        return Math.ceil(chars / 3.5);
    }
    
    /**
     * Validate API settings
     */
    validateSettings(settings) {
        if (!settings?.api?.geminiApiKey) {
            throw new Error('API key is required');
        }
        
        const api = settings.api;
        
        if (api.maxTokens && (api.maxTokens < 1 || api.maxTokens > 8192)) {
            throw new Error('Max tokens must be between 1 and 8192');
        }
        
        if (api.temperature && (api.temperature < 0 || api.temperature > 2)) {
            throw new Error('Temperature must be between 0 and 2');
        }
        
        if (api.timeout && (api.timeout < 1 || api.timeout > 300)) {
            throw new Error('Timeout must be between 1 and 300 seconds');
        }
        
        return true;
    }
    
    /**
     * Get supported models
     */
    getSupportedModels() {
        return [
            'gemini-pro',
            'gemini-pro-vision'
        ];
    }
    
    /**
     * Get API status
     */
    getStatus() {
        return {
            initialized: !!this.client && !!this.model,
            model: this.model?.model || null
        };
    }
}

module.exports = GeminiApiClient;