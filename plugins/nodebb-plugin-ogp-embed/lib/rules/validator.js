'use strict';

const utils = require('./utils');

class RulesValidator {
    constructor() {
        this.maxNameLength = utils.maxNameLength;
    }

    /**
     * Validate rule data
     * @param {Object} ruleData
     * @returns {Object} Validation result
     */
    validateRule(ruleData) {
        const errors = [];

        // Early guard for invalid rule data
        if (!ruleData || typeof ruleData !== 'object') {
            errors.push('Invalid rule data');
            return {
                valid: false,
                errors: errors
            };
        }

        // Validate name
        if (!ruleData.name || typeof ruleData.name !== 'string') {
            errors.push('Rule name is required');
        } else if (ruleData.name.length > this.maxNameLength) {
            errors.push(`Rule name must be less than ${this.maxNameLength} characters`);
        }

        // Validate pattern
        const patternValidation = utils.validatePattern(ruleData.pattern);
        if (!patternValidation.valid) {
            errors.push(...patternValidation.errors);
        }

        // Validate template
        const templateValidation = utils.validateTemplate(ruleData.template);
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
     * Sanitize rule data
     * @param {Object} ruleData
     * @returns {Object} Sanitized data
     */
    sanitizeRule(ruleData) {
        return {
            name: utils.sanitizeString(ruleData.name, this.maxNameLength),
            pattern: utils.sanitizeString(ruleData.pattern, utils.maxPatternLength),
            template: utils.sanitizeString(ruleData.template, utils.maxTemplateLength),
            enabled: !!ruleData.enabled,
            priority: Math.max(0, Math.min(9999, parseInt(ruleData.priority, 10) || 0))
        };
    }

}

module.exports = new RulesValidator();