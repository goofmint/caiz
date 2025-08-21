'use strict';

const winston = require.main.require('winston');

class RulesUtils {
    constructor() {
        this.maxPatternLength = 500;
        this.maxTemplateLength = 5000;
        this.maxNameLength = 100;
        this.maxExecutionTime = 100; // ms
    }

    /**
     * Validate regex pattern with detailed error information
     * @param {string} pattern - Regex pattern to validate
     * @returns {Object} Validation result { valid: boolean, errors: string[] }
     */
    validatePattern(pattern) {
        const errors = [];

        if (!pattern || typeof pattern !== 'string') {
            return { valid: false, errors: ['Pattern is required'] };
        }

        if (pattern.length > this.maxPatternLength) {
            errors.push(`Pattern must be less than ${this.maxPatternLength} characters`);
        }

        // Check for valid regex syntax
        try {
            new RegExp(pattern);
        } catch (err) {
            errors.push(`Invalid regex pattern: ${err.message}`);
        }

        // Check for excessive backtracking potential
        const backtrackCount = (pattern.match(/[\*\+\?]/g) || []).length;
        if (backtrackCount > 10) {
            errors.push('Pattern contains too many quantifiers');
        }

        // Warn about complex patterns (but don't fail)
        if (/\(\?[=!<]/.test(pattern)) {
            winston.warn('[ogp-embed] Pattern contains lookahead/lookbehind assertions');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Quick boolean validation for patterns (for processor use)
     * @param {string} pattern - Regex pattern to validate
     * @returns {boolean} True if valid
     */
    isValidPattern(pattern) {
        const result = this.validatePattern(pattern);
        if (!result.valid) {
            winston.warn(`[ogp-embed] Invalid regex pattern: ${result.errors.join(', ')}`);
        }
        return result.valid;
    }

    /**
     * Compile regex pattern safely
     * @param {string} pattern - Pattern to compile
     * @returns {RegExp|null} Compiled regex or null if invalid
     */
    compilePattern(pattern) {
        if (!this.isValidPattern(pattern)) {
            return null;
        }

        try {
            return new RegExp(pattern);
        } catch (err) {
            winston.error(`[ogp-embed] Failed to compile regex: ${err.message}`);
            return null;
        }
    }

    /**
     * Execute regex with timeout protection
     * @param {RegExp} regex - Compiled regex
     * @param {string} text - Text to match
     * @returns {Array|null} Match results or null
     */
    executeRegex(regex, text) {
        const startTime = Date.now();
        
        try {
            const matches = text.match(regex);
            
            // Check execution time
            if (Date.now() - startTime > this.maxExecutionTime) {
                winston.warn('[ogp-embed] Regex execution timeout');
                return null;
            }

            return matches;

        } catch (err) {
            winston.error(`[ogp-embed] Regex execution error: ${err.message}`);
            return null;
        }
    }

    /**
     * Validate HTML template
     * @param {string} template - Template to validate
     * @returns {Object} Validation result { valid: boolean, errors: string[] }
     */
    validateTemplate(template) {
        const errors = [];

        if (!template || typeof template !== 'string') {
            return { valid: false, errors: ['Template is required'] };
        }

        if (template.length > this.maxTemplateLength) {
            errors.push(`Template must be less than ${this.maxTemplateLength} characters`);
        }

        // Check for balanced HTML tags (basic check)
        const openTags = template.match(/<(\w+)[^>]*>/g) || [];
        const closeTags = template.match(/<\/(\w+)>/g) || [];
        
        const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
        
        const openCount = {};
        const closeCount = {};
        
        openTags.forEach(tag => {
            const tagName = tag.match(/<(\w+)/)[1].toLowerCase();
            if (!selfClosing.includes(tagName)) {
                openCount[tagName] = (openCount[tagName] || 0) + 1;
            }
        });
        
        closeTags.forEach(tag => {
            const tagName = tag.match(/<\/(\w+)>/)[1].toLowerCase();
            closeCount[tagName] = (closeCount[tagName] || 0) + 1;
        });
        
        // Check for mismatched tags
        const allTags = new Set([...Object.keys(openCount), ...Object.keys(closeCount)]);
        for (const tag of allTags) {
            if ((openCount[tag] || 0) !== (closeCount[tag] || 0)) {
                errors.push(`Mismatched HTML tags: <${tag}>`);
            }
        }

        // Check for dangerous content
        if (/<script[^>]*>/i.test(template)) {
            errors.push('Template cannot contain <script> tags');
        }

        if (/on\w+\s*=/i.test(template)) {
            errors.push('Template cannot contain inline event handlers');
        }

        if (/javascript:/i.test(template)) {
            errors.push('Template cannot contain javascript: URLs');
        }

        if (/data:text\/html/i.test(template)) {
            errors.push('Template cannot contain data:text/html URLs');
        }

        // Check for placeholder format
        const placeholders = template.match(/\$\d+/g) || [];
        const uniquePlaceholders = new Set(placeholders);
        
        if (uniquePlaceholders.size > 0) {
            const maxPlaceholder = Math.max(...Array.from(uniquePlaceholders).map(p => parseInt(p.substring(1))));
            if (maxPlaceholder > 9) {
                errors.push('Template placeholders should be $0-$9');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Sanitize string value
     * @param {*} value - Value to sanitize
     * @param {number} maxLength - Maximum length
     * @returns {string} Sanitized string
     */
    sanitizeString(value, maxLength) {
        if (!value) {
            return '';
        }

        return String(value)
            .trim()
            .substring(0, maxLength);
    }

    /**
     * Escape HTML entities
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escape(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
}

module.exports = new RulesUtils();