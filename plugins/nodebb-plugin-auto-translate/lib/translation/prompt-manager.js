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
            const systemPrompt = settings?.prompts?.systemPrompt || 
                'You are a professional localization translator.';
            
            const prompt = `${systemPrompt}

Task:
Translate the given SOURCE text into the following 20 languages and return ONLY a single JSON object with exactly these keys:
["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur","id","de","ja","fil","tr","ko","fa","sw","ha","it"]

Requirements:
- Preserve meaning, tone, and register; produce idiomatic, natural sentences.
- Keep placeholders, variables, code, and markdown as-is (e.g., {name}, {{variable}}, \`code\`, URLs).
- Don't add explanations, notes, or extra fields.
- Don't transliterate brand names unless there is a widely used localized form.
- If the source contains line breaks, keep them logically.
- If a translation is truly not applicable, return an empty string "" for that key.

Now translate this SOURCE:
${content}`;
            
            winston.verbose('[auto-translate] Built multi-language prompt:', {
                contentLength: content.length,
                languageCount: this.supportedLanguages.length
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