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
    const { router, middleware } = params;
    const middlewares = [
        middleware.ensureLoggedIn,
        middleware.admin.checkPrivileges
    ];

    // API routes
    router.get('/admin/plugins/ogp-embed/rules', middlewares, adminRules.getRules);
    router.post('/admin/plugins/ogp-embed/rules', middlewares, adminRules.createRule);
    router.put('/admin/plugins/ogp-embed/rules/:ruleId', middlewares, adminRules.updateRule);
    router.delete('/admin/plugins/ogp-embed/rules/:ruleId', middlewares, adminRules.deleteRule);
    router.post('/admin/plugins/ogp-embed/rules/reorder', middlewares, adminRules.reorderRules);
    router.post('/admin/plugins/ogp-embed/rules/test', middlewares, adminRules.testRule);
    
    winston.info('[ogp-embed] Admin routes registered');
};

/**
 * Get all rules
 */
adminRules.getRules = async function(req, res) {
    try {
        const rules = await manager.getRules();
        res.json({ rules });
    } catch (err) {
        winston.error(`[ogp-embed] API error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a new rule
 */
adminRules.createRule = async function(req, res) {
    try {
        const ruleData = req.body;
        
        // Validate
        const validation = validator.validateRule(ruleData);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                errors: validation.errors 
            });
        }

        // Sanitize and create
        const sanitized = validator.sanitizeRule(ruleData);
        const ruleId = await manager.createRule(sanitized);
        const rule = await manager.getRule(ruleId);

        res.json({ 
            success: true,
            rule: rule
        });

    } catch (err) {
        winston.error(`[ogp-embed] API error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update an existing rule
 */
adminRules.updateRule = async function(req, res) {
    try {
        const { ruleId } = req.params;
        const ruleData = req.body;

        // Validate
        const validation = validator.validateRule(ruleData);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                errors: validation.errors 
            });
        }

        // Sanitize and update
        const sanitized = validator.sanitizeRule(ruleData);
        await manager.updateRule(ruleId, sanitized);
        const rule = await manager.getRule(ruleId);

        // Clear processor cache when rules change
        processor.clearCache();

        res.json({ 
            success: true,
            rule: rule
        });

    } catch (err) {
        winston.error(`[ogp-embed] API error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete a rule
 */
adminRules.deleteRule = async function(req, res) {
    try {
        const { ruleId } = req.params;
        
        await manager.deleteRule(ruleId);
        
        // Clear processor cache when rules change
        processor.clearCache();

        res.json({ success: true });

    } catch (err) {
        winston.error(`[ogp-embed] API error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Reorder rules
 */
adminRules.reorderRules = async function(req, res) {
    try {
        const { ruleIds } = req.body;

        if (!Array.isArray(ruleIds)) {
            return res.status(400).json({ error: 'ruleIds must be an array' });
        }

        await manager.reorderRules(ruleIds);

        res.json({ success: true });

    } catch (err) {
        winston.error(`[ogp-embed] API error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Test a rule
 */
adminRules.testRule = async function(req, res) {
    try {
        const { rule, testUrl } = req.body;

        if (!rule || !testUrl) {
            return res.status(400).json({ error: 'Rule and test URL are required' });
        }

        // Validate rule
        const validation = validator.validateRule(rule);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Invalid rule', 
                errors: validation.errors 
            });
        }

        // Test the rule
        const result = await processor.testRule(rule, testUrl);

        res.json(result);

    } catch (err) {
        winston.error(`[ogp-embed] API error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
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