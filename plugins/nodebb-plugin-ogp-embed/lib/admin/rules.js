'use strict';

const winston = require.main.require('winston');
const privileges = require.main.require('./src/privileges');
const manager = require('../rules/manager');
const validator = require('../rules/validator');
const processor = require('../rules/processor');

const adminRules = {};

/**
 * Register admin routes
 */
adminRules.init = function(params) {
    winston.info('[ogp-embed] Admin module initialized (WebSocket only)');
};


/**
 * Register Socket.IO handlers
 */
adminRules.registerSockets = function(socketPlugins) {
    // Admin socket handlers using NodeBB's standard pattern
    socketPlugins['ogp-embed'] = {
        getRules: async function(socket, data) {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                throw new Error('[[error:no-privileges]]');
            }

            const rules = await manager.getRules();
            return rules;
        },

        createRule: async function(socket, data) {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                throw new Error('[[error:no-privileges]]');
            }

            const validation = validator.validateRule(data);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            const sanitized = validator.sanitizeRule(data);
            const ruleId = await manager.createRule(sanitized);
            const rule = await manager.getRule(ruleId);

            return rule;
        },

        updateRule: async function(socket, data) {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                throw new Error('[[error:no-privileges]]');
            }

            const { ruleId, ...ruleData } = data;

            const validation = validator.validateRule(ruleData);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            const sanitized = validator.sanitizeRule(ruleData);
            await manager.updateRule(ruleId, sanitized);
            const rule = await manager.getRule(ruleId);

            processor.clearCache();

            return rule;
        },

        deleteRule: async function(socket, ruleId) {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                throw new Error('[[error:no-privileges]]');
            }

            await manager.deleteRule(ruleId);
            processor.clearCache();

            return { success: true };
        },

        reorderRules: async function(socket, ruleIds) {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                throw new Error('[[error:no-privileges]]');
            }

            await manager.reorderRules(ruleIds);
            
            return { success: true };
        },

        testRule: async function(socket, data) {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                throw new Error('[[error:no-privileges]]');
            }

            const { rule, testUrl } = data;

            const validation = validator.validateRule(rule);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            const result = await processor.testRule(rule, testUrl);
            
            return result;
        }
    };

    winston.info('[ogp-embed] Socket handlers registered');
};

module.exports = adminRules;