'use strict';

const winston = require.main.require('winston');

class PromptManager {
    constructor() {
        this.templates = {
            system: '',
            instruction: '',
            context: '',
            format: ''
        };
    }
    
    /**
     * Build translation prompt from templates
     */
    buildTranslationPrompt(content, targetLang, sourceLang, settings) {
        try {
            // Use settings if provided, otherwise use defaults
            const prompts = settings?.prompts || {
                systemPrompt: 'You are a professional translator. Translate the following content accurately while preserving the original meaning and context.',
                translationInstruction: 'Translate to {{targetLang}} from {{sourceLang}}. Maintain formatting, code blocks, and markdown syntax.',
                contextPreservation: 'Preserve technical terms, product names, and proper nouns appropriately.',
                outputFormat: 'Return only the translated text without any explanations or notes.'
            };
            
            // Build system prompt
            const systemPrompt = prompts.systemPrompt;
            
            // Build instruction with language replacement
            const instruction = this.replacePlaceholders(prompts.translationInstruction, {
                targetLang: this.getLanguageName(targetLang),
                sourceLang: sourceLang ? this.getLanguageName(sourceLang) : 'auto-detected language'
            });
            
            // Combine all parts
            const fullPrompt = [
                systemPrompt,
                instruction,
                prompts.contextPreservation,
                prompts.outputFormat,
                '',
                'Content to translate:',
                content
            ].filter(Boolean).join('\n');
            
            winston.verbose('[auto-translate] Built prompt for translation:', {
                targetLang,
                sourceLang,
                contentLength: content.length
            });
            
            return fullPrompt;
        } catch (err) {
            winston.error('[auto-translate] Failed to build prompt:', err);
            throw err;
        }
    }
    
    /**
     * Replace placeholders in template
     */
    replacePlaceholders(template, values) {
        let result = template;
        Object.keys(values).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(placeholder, values[key]);
        });
        return result;
    }
    
    /**
     * Get human-readable language name
     */
    getLanguageName(langCode) {
        const languageNames = {
            'en': 'English',
            'ja': 'Japanese',
            'zh-CN': 'Simplified Chinese',
            'zh-TW': 'Traditional Chinese',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ko': 'Korean',
            'ru': 'Russian',
            'pt': 'Portuguese',
            'it': 'Italian',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'bn': 'Bengali',
            'ur': 'Urdu',
            'id': 'Indonesian',
            'fil': 'Filipino',
            'tr': 'Turkish',
            'fa': 'Persian',
            'sw': 'Swahili',
            'ha': 'Hausa'
        };
        
        return languageNames[langCode] || langCode;
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