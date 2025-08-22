'use strict';

const winston = require.main.require('winston');

// 対応言語キー（仕様に基づく）
const LANG_KEYS = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                   "id","de","ja","fil","tr","ko","fa","sw","ha","it"];

class PromptManager {
    constructor() {
        this.supportedLanguages = LANG_KEYS;
    }
    
    /**
     * Build multi-language translation prompt
     */
    buildTranslationPrompt(content, settings) {
        try {
            if (!settings?.prompts?.systemPrompt) {
                throw new Error('System prompt not configured in settings');
            }
            
            // Use the configured system prompt and replace placeholders
            const prompt = settings.prompts.systemPrompt
                .replace('{content}', content)
                .replace('{supportedLanguages}', JSON.stringify(this.supportedLanguages));
            
            winston.verbose('[auto-translate] Built translation prompt from settings:', {
                contentLength: content.length,
                languageCount: this.supportedLanguages.length,
                promptLength: prompt.length
            });
            
            return prompt;
        } catch (err) {
            winston.error('[auto-translate] Failed to build prompt:', err);
            throw err;
        }
    }
    
    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
    
    /**
     * Validate prompt structure
     */
    validatePrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Invalid prompt: must be a non-empty string');
        }
        
        if (prompt.length > 32000) {
            throw new Error('Prompt exceeds maximum length of 32000 characters');
        }
        
        return true;
    }
    
    /**
     * Extract text content for translation (remove HTML/markdown if needed)
     */
    prepareContentForTranslation(content) {
        // For now, keep content as-is to preserve formatting
        // Could add logic here to handle specific content types
        return content;
    }
    
    /**
     * Post-process translated content
     */
    postProcessTranslation(translatedContent, originalContent) {
        // Ensure markdown/HTML structure is preserved
        // Could add logic here to restore formatting if needed
        return translatedContent;
    }
}

module.exports = PromptManager;