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
adminRules.registerSockets = function(sockets) {
    // Admin socket handlers
    sockets.admin = sockets.admin || {};
    sockets.admin.ogpEmbed = sockets.admin.ogpEmbed || {};

    sockets.admin.ogpEmbed.getRules = async function(socket, data, callback) {
        try {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                return callback(new Error('[[error:no-privileges]]'));
            }

            const rules = await manager.getRules();
            callback(null, rules);

        } catch (err) {
            winston.error(`[ogp-embed] Socket error: ${err.message}`);
            callback(err);
        }
    };

    sockets.admin.ogpEmbed.createRule = async function(socket, data, callback) {
        try {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                return callback(new Error('[[error:no-privileges]]'));
            }

            const validation = validator.validateRule(data);
            if (!validation.valid) {
                return callback(new Error(validation.errors.join(', ')));
            }

            const sanitized = validator.sanitizeRule(data);
            const ruleId = await manager.createRule(sanitized);
            const rule = await manager.getRule(ruleId);

            callback(null, rule);

        } catch (err) {
            winston.error(`[ogp-embed] Socket error: ${err.message}`);
            callback(err);
        }
    };

    sockets.admin.ogpEmbed.updateRule = async function(socket, data, callback) {
        try {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                return callback(new Error('[[error:no-privileges]]'));
            }

            const { ruleId, ...ruleData } = data;

            const validation = validator.validateRule(ruleData);
            if (!validation.valid) {
                return callback(new Error(validation.errors.join(', ')));
            }

            const sanitized = validator.sanitizeRule(ruleData);
            await manager.updateRule(ruleId, sanitized);
            const rule = await manager.getRule(ruleId);

            processor.clearCache();

            callback(null, rule);

        } catch (err) {
            winston.error(`[ogp-embed] Socket error: ${err.message}`);
            callback(err);
        }
    };

    sockets.admin.ogpEmbed.deleteRule = async function(socket, ruleId, callback) {
        try {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                return callback(new Error('[[error:no-privileges]]'));
            }

            await manager.deleteRule(ruleId);
            processor.clearCache();

            callback(null, { success: true });

        } catch (err) {
            winston.error(`[ogp-embed] Socket error: ${err.message}`);
            callback(err);
        }
    };

    sockets.admin.ogpEmbed.reorderRules = async function(socket, ruleIds, callback) {
        try {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                return callback(new Error('[[error:no-privileges]]'));
            }

            await manager.reorderRules(ruleIds);
            
            callback(null, { success: true });

        } catch (err) {
            winston.error(`[ogp-embed] Socket error: ${err.message}`);
            callback(err);
        }
    };

    sockets.admin.ogpEmbed.testRule = async function(socket, data, callback) {
        try {
            const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
            if (!isAdmin) {
                return callback(new Error('[[error:no-privileges]]'));
            }

            const { rule, testUrl } = data;

            const validation = validator.validateRule(rule);
            if (!validation.valid) {
                return callback(new Error(validation.errors.join(', ')));
            }

            const result = await processor.testRule(rule, testUrl);
            
            callback(null, result);

        } catch (err) {
            winston.error(`[ogp-embed] Socket error: ${err.message}`);
            callback(err);
        }
    };

    winston.info('[ogp-embed] Socket handlers registered');
};

module.exports = adminRules;