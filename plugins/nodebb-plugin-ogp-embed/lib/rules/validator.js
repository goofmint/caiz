'use strict';

const winston = require.main.require('winston');

class RulesValidator {
    constructor() {
        this.maxPatternLength = 500;
        this.maxTemplateLength = 5000;
        this.maxNameLength = 100;
    }

    /**
     * Validate rule data
     * @param {Object} ruleData
     * @returns {Object} Validation result
     */
    validateRule(ruleData) {
        const errors = [];

        // Validate name
        if (!ruleData.name || typeof ruleData.name !== 'string') {
            errors.push('Rule name is required');
        } else if (ruleData.name.length > this.maxNameLength) {
            errors.push(`Rule name must be less than ${this.maxNameLength} characters`);
        }

        // Validate pattern
        const patternValidation = this.validatePattern(ruleData.pattern);
        if (!patternValidation.valid) {
            errors.push(...patternValidation.errors);
        }

        // Validate template
        const templateValidation = this.validateTemplate(ruleData.template);
        if (!templateValidation.valid) {
            errors.push(...templateValidation.errors);
        }

        // Validate priority
        if (ruleData.priority !== undefined) {
            const priority = parseInt(ruleData.priority, 10);
            if (isNaN(priority) || priority < 0 || priority > 9999) {
                errors.push('Priority must be a number between 0 and 9999');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate regex pattern
     * @param {string} pattern
     * @returns {Object} Validation result
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

        // Check for ReDoS vulnerable patterns
        const redosPatterns = [
            /(\w+\+)+/,
            /(\w+\*)+/,
            /(\w+\{[\d,]+\})+/,
            /([\w\s]+)+$/,
            /(\w+)+\w+/,
            /(\S+)+\S+/,
            /(.*)+.*/
        ];

        for (const redos of redosPatterns) {
            if (redos.test(pattern)) {
                errors.push('Pattern contains potentially dangerous nested quantifiers (ReDoS risk)');
                break;
            }
        }

        // Check for excessive backtracking
        const backtrackCount = (pattern.match(/[\*\+\?]/g) || []).length;
        if (backtrackCount > 10) {
            errors.push('Pattern contains too many quantifiers');
        }

        // Check for lookaheads/lookbehinds (complexity)
        if (/\(\?[=!<]/.test(pattern)) {
            winston.warn('[ogp-embed] Pattern contains lookahead/lookbehind assertions');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate template string
     * @param {string} template
     * @returns {Object} Validation result
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
     * Sanitize rule data
     * @param {Object} ruleData
     * @returns {Object} Sanitized data
     */
    sanitizeRule(ruleData) {
        return {
            name: this.sanitizeString(ruleData.name, this.maxNameLength),
            pattern: this.sanitizeString(ruleData.pattern, this.maxPatternLength),
            template: this.sanitizeString(ruleData.template, this.maxTemplateLength),
            enabled: !!ruleData.enabled,
            priority: Math.max(0, Math.min(9999, parseInt(ruleData.priority, 10) || 0))
        };
    }

    /**
     * Sanitize string value
     * @param {*} value
     * @param {number} maxLength
     * @returns {string}
     */
    sanitizeString(value, maxLength) {
        if (!value) {
            return '';
        }

        return String(value)
            .trim()
            .substring(0, maxLength);
    }
}

module.exports = new RulesValidator();