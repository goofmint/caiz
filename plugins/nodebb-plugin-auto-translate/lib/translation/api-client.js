'use strict';

const winston = require.main.require('winston');
const { GoogleGenAI } = require('@google/genai');

class GeminiApiClient {
    constructor() {
        this.client = null;
        this.model = null;
        this.defaultSettings = {
            model: 'gemini-pro',
            maxTokens: 2048,
            temperature: 0.3,
            timeout: 30
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
                model: 'gemini-2.0-flash-001',
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
     * Translate content using Gemini API
     */
    async translateContent(prompt, settings = {}) {
        if (!this.model) {
            throw new Error('API client not initialized');
        }
        
        try {
            const apiSettings = { ...this.defaultSettings, ...settings.api };
            
            // Set timeout
            const timeoutMs = (apiSettings.timeout || 30) * 1000;
            
            const result = await Promise.race([
                this.model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: apiSettings.maxTokens,
                        temperature: apiSettings.temperature
                    }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Translation timeout')), timeoutMs)
                )
            ]);
            
            const response = result?.response;
            if (!response) {
                throw new Error('No response from API');
            }
            
            const text = response.text();
            if (!text) {
                throw new Error('Empty response from API');
            }
            
            winston.verbose('[auto-translate] Translation successful:', {
                inputLength: prompt.length,
                outputLength: text.length
            });
            
            return {
                success: true,
                translatedText: text,
                usage: {
                    promptTokens: this.estimateTokens(prompt),
                    completionTokens: this.estimateTokens(text)
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