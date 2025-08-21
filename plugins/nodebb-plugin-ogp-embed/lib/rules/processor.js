'use strict';

const winston = require.main.require('winston');
const validator = require.main.require('validator');
const manager = require('./manager');
const utils = require('./utils');

class RegexEmbedProcessor {
    constructor() {
        this.compiledPatterns = new Map();
        this.maxExecutionTime = 100; // Max regex execution time in ms
    }

    /**
     * Process URL with regex rules
     * @param {string} url - URL to process
     * @returns {string|null} - HTML embed or null
     */
    async processURL(url) {
        try {
            const rules = await manager.getEnabledRules();
            
            for (const rule of rules) {
                const result = await this.applyRule(url, rule);
                if (result) {
                    winston.info(`[ogp-embed] URL matched rule "${rule.name}": ${url}`);
                    return result;
                }
            }

            // No rule matched
            return null;

        } catch (err) {
            winston.error(`[ogp-embed] Failed to process URL ${url}: ${err.message}`);
            return null;
        }
    }

    /**
     * Apply a single rule to URL
     * @param {string} url - URL to test
     * @param {Object} rule - Rule to apply
     * @returns {string|null} - HTML result or null
     */
    async applyRule(url, rule) {
        try {
            if (!rule.pattern || !rule.template) {
                return null;
            }

            // Get or compile regex using cache
            const regex = this.getCompiledPattern(rule.pattern);
            if (!regex) {
                winston.warn(`[ogp-embed] Invalid regex pattern in rule "${rule.name}"`);
                return null;
            }

            // Test with timeout protection
            const matches = utils.executeRegex(regex, url);
            if (!matches) {
                return null;
            }

            // Replace template variables
            const html = this.replaceTemplate(rule.template, matches);
            return html;

        } catch (err) {
            winston.error(`[ogp-embed] Failed to apply rule "${rule.name}": ${err.message}`);
            return null;
        }
    }

    /**
     * Get compiled regex pattern (with caching)
     * @param {string} pattern - Regex pattern string
     * @returns {RegExp|null}
     */
    getCompiledPattern(pattern) {
        if (this.compiledPatterns.has(pattern)) {
            return this.compiledPatterns.get(pattern);
        }

        const regex = utils.compilePattern(pattern);
        if (regex) {
            this.compiledPatterns.set(pattern, regex);
        }
        return regex;
    }


    /**
     * Replace template variables with match groups
     * @param {string} template - Template string with $1, $2, etc.
     * @param {Array} matches - Regex match results
     * @returns {string} - Processed HTML
     */
    replaceTemplate(template, matches) {
        let result = template;

        // Replace $0 with full match
        result = result.replace(/\$0/g, utils.escape(matches[0] || ''));

        // Replace $1, $2, etc. with capture groups
        for (let i = 1; i < matches.length; i++) {
            const placeholder = new RegExp(`\\$${i}`, 'g');
            const value = matches[i] || '';
            
            // Escape HTML unless it's in an attribute (URL)
            const escaped = this.shouldEscapeValue(template, i) 
                ? utils.escape(value)
                : encodeURIComponent(value);
            
            result = result.replace(placeholder, escaped);
        }

        // Replace any remaining placeholders with empty string
        result = result.replace(/\$\d+/g, '');

        return result;
    }

    /**
     * Determine if a template value should be HTML-escaped
     * @param {string} template - Template string
     * @param {number} index - Placeholder index
     * @returns {boolean}
     */
    shouldEscapeValue(template, index) {
        // Check if placeholder is within an attribute (simplified check)
        const placeholder = `$${index}`;
        const beforeIndex = template.indexOf(placeholder);
        
        if (beforeIndex === -1) {
            return true;
        }

        // Look for quotes before the placeholder
        const before = template.substring(Math.max(0, beforeIndex - 50), beforeIndex);
        const inAttribute = /(?:src|href|data-\w+)=['"]([^'"]*)?$/.test(before);

        return !inAttribute;
    }


    /**
     * Clear compiled pattern cache
     */
    clearCache() {
        this.compiledPatterns.clear();
        winston.info('[ogp-embed] Cleared regex pattern cache');
    }

    /**
     * Test a rule with a sample URL
     * @param {Object} rule - Rule to test
     * @param {string} testUrl - URL to test with
     * @returns {Object} - Test result
     */
    async testRule(rule, testUrl) {
        try {
            const result = await this.applyRule(testUrl, rule);
            
            return {
                success: !!result,
                matched: !!result,
                output: result || null,
                error: null
            };

        } catch (err) {
            return {
                success: false,
                matched: false,
                output: null,
                error: err.message
            };
        }
    }
}

module.exports = new RegexEmbedProcessor();