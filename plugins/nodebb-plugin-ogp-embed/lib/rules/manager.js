'use strict';

const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const crypto = require('crypto');

class RulesManager {
    constructor() {
        this.collectionKey = 'ogp-embed:rules';
        this.rulesCache = null;
        this.cacheExpiry = Date.now();
        this.cacheDuration = 60 * 1000; // 1 minute cache
    }

    /**
     * Initialize rules manager
     */
    async initialize() {
        winston.info('[ogp-embed] Rules manager initialized');
        await this.loadRules();
    }

    /**
     * Get all rules (with caching)
     * @returns {Array} Rules sorted by priority
     */
    async getRules() {
        if (this.rulesCache && Date.now() < this.cacheExpiry) {
            return this.rulesCache;
        }

        await this.loadRules();
        return this.rulesCache;
    }

    /**
     * Load rules from database
     */
    async loadRules() {
        try {
            const ruleIds = await db.getSortedSetRange(this.collectionKey, 0, -1);
            const rules = [];

            for (const ruleId of ruleIds) {
                const rule = await this.getRule(ruleId);
                if (rule) {
                    rules.push(rule);
                }
            }

            // Sort by priority (lower number = higher priority)
            rules.sort((a, b) => (a.priority || 999) - (b.priority || 999));

            this.rulesCache = rules;
            this.cacheExpiry = Date.now() + this.cacheDuration;

            winston.info(`[ogp-embed] Loaded ${rules.length} rules`);
            return rules;

        } catch (err) {
            winston.error(`[ogp-embed] Failed to load rules: ${err.message}`);
            return [];
        }
    }

    /**
     * Get a single rule by ID
     * @param {string} ruleId
     * @returns {Object|null}
     */
    async getRule(ruleId) {
        try {
            const key = `${this.collectionKey}:${ruleId}`;
            const rule = await db.getObject(key);
            
            if (!rule) {
                return null;
            }

            // Parse boolean and number fields
            rule.enabled = rule.enabled === 'true' || rule.enabled === true;
            rule.priority = parseInt(rule.priority, 10) || 0;
            rule.ruleId = ruleId;

            return rule;

        } catch (err) {
            winston.error(`[ogp-embed] Failed to get rule ${ruleId}: ${err.message}`);
            return null;
        }
    }

    /**
     * Get enabled rules only
     * @returns {Array}
     */
    async getEnabledRules() {
        const rules = await this.getRules();
        return rules.filter(rule => rule.enabled);
    }

    /**
     * Create a new rule
     * @param {Object} ruleData
     * @returns {string} Rule ID
     */
    async createRule(ruleData) {
        try {
            const ruleId = crypto.randomBytes(8).toString('hex');
            const key = `${this.collectionKey}:${ruleId}`;

            const rule = {
                name: ruleData.name || 'Unnamed Rule',
                pattern: ruleData.pattern || '',
                template: ruleData.template || '',
                enabled: ruleData.enabled !== false,
                priority: parseInt(ruleData.priority, 10) || 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await db.setObject(key, rule);
            await db.sortedSetAdd(this.collectionKey, rule.priority, ruleId);

            // Clear cache
            this.rulesCache = null;

            winston.info(`[ogp-embed] Created rule ${ruleId}: ${rule.name}`);
            return ruleId;

        } catch (err) {
            winston.error(`[ogp-embed] Failed to create rule: ${err.message}`);
            throw err;
        }
    }

    /**
     * Update an existing rule
     * @param {string} ruleId
     * @param {Object} ruleData
     */
    async updateRule(ruleId, ruleData) {
        try {
            const key = `${this.collectionKey}:${ruleId}`;
            const existing = await this.getRule(ruleId);
            
            if (!existing) {
                throw new Error('Rule not found');
            }

            const rule = {
                ...existing,
                name: ruleData.name !== undefined ? ruleData.name : existing.name,
                pattern: ruleData.pattern !== undefined ? ruleData.pattern : existing.pattern,
                template: ruleData.template !== undefined ? ruleData.template : existing.template,
                enabled: ruleData.enabled !== undefined ? ruleData.enabled : existing.enabled,
                priority: ruleData.priority !== undefined ? parseInt(ruleData.priority, 10) : existing.priority,
                updatedAt: Date.now()
            };

            // Remove ruleId from object before saving
            delete rule.ruleId;

            await db.setObject(key, rule);

            // Update priority in sorted set if changed
            if (rule.priority !== existing.priority) {
                await db.sortedSetRemove(this.collectionKey, ruleId);
                await db.sortedSetAdd(this.collectionKey, rule.priority, ruleId);
            }

            // Clear cache
            this.rulesCache = null;

            winston.info(`[ogp-embed] Updated rule ${ruleId}: ${rule.name}`);

        } catch (err) {
            winston.error(`[ogp-embed] Failed to update rule ${ruleId}: ${err.message}`);
            throw err;
        }
    }

    /**
     * Delete a rule
     * @param {string} ruleId
     */
    async deleteRule(ruleId) {
        try {
            const key = `${this.collectionKey}:${ruleId}`;
            const rule = await this.getRule(ruleId);
            
            if (!rule) {
                throw new Error('Rule not found');
            }

            await db.delete(key);
            await db.sortedSetRemove(this.collectionKey, ruleId);

            // Clear cache
            this.rulesCache = null;

            winston.info(`[ogp-embed] Deleted rule ${ruleId}: ${rule.name}`);

        } catch (err) {
            winston.error(`[ogp-embed] Failed to delete rule ${ruleId}: ${err.message}`);
            throw err;
        }
    }

    /**
     * Clear all rules
     */
    async clearAllRules() {
        try {
            const ruleIds = await db.getSortedSetRange(this.collectionKey, 0, -1);
            
            for (const ruleId of ruleIds) {
                const key = `${this.collectionKey}:${ruleId}`;
                await db.delete(key);
            }

            await db.delete(this.collectionKey);
            
            // Clear cache
            this.rulesCache = null;

            winston.info('[ogp-embed] Cleared all rules');

        } catch (err) {
            winston.error(`[ogp-embed] Failed to clear rules: ${err.message}`);
            throw err;
        }
    }

    /**
     * Reorder rules by updating priorities
     * @param {Array} ruleIds - Array of rule IDs in desired order
     */
    async reorderRules(ruleIds) {
        try {
            for (let i = 0; i < ruleIds.length; i++) {
                const ruleId = ruleIds[i];
                await this.updateRule(ruleId, { priority: i });
            }

            // Clear cache
            this.rulesCache = null;

            winston.info('[ogp-embed] Reordered rules');

        } catch (err) {
            winston.error(`[ogp-embed] Failed to reorder rules: ${err.message}`);
            throw err;
        }
    }
}

module.exports = new RulesManager();