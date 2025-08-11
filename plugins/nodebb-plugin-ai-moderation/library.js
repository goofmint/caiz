'use strict';

const plugin = {};
const logger = require.main.require('./src/logger');
const db = require.main.require('./src/database');
const socketPlugins = require.main.require('./src/socket.io/plugins');

// コアモジュールの読み込み
const settings = require('./libs/core/settings');
const ModerationLogger = require('./libs/core/logger');
const ContentAnalyzer = require('./libs/core/analyzer');
const apiFactory = require('./libs/api');
const postsHooks = require('./libs/hooks/posts');
const topicsHooks = require('./libs/hooks/topics');

// インスタンス
const moderationLogger = new ModerationLogger();
const contentAnalyzer = new ContentAnalyzer();

plugin.init = async function(params) {
    const { router, middleware } = params;
    
    logger.info('[ai-moderation] Initializing AI Moderation Plugin');
    
    // Initialize database schema
    await initializeDatabase();
    
    // Setup admin routes
    setupAdminRoutes(router, middleware);
    
    // Setup socket handlers
    setupSocketHandlers();
    
    logger.info('[ai-moderation] AI Moderation Plugin initialized');
};

plugin.addAdminNavigation = function(header, callback) {
    header.plugins.push({
        route: '/plugins/ai-moderation',
        icon: 'fa fa-shield-alt',
        name: '[[ai-moderation:ai-moderation]]'
    });
    
    callback(null, header);
};

// フック登録
plugin.moderateNewPost = postsHooks.moderateNewPost;
plugin.moderatePostEdit = postsHooks.moderatePostEdit;
plugin.moderateNewTopic = topicsHooks.moderateNewTopic;
plugin.moderateTopicEdit = topicsHooks.moderateTopicEdit;

async function initializeDatabase() {
    try {
        // データベース初期化処理
        logger.info('[ai-moderation] Database initialized');
    } catch (error) {
        logger.error('[ai-moderation] Database initialization failed', { error: error.message });
        throw error;
    }
}

function setupAdminRoutes(router, middleware) {
    router.get('/admin/plugins/ai-moderation', middleware.admin.buildHeader, renderAdmin);
    router.get('/api/admin/plugins/ai-moderation', middleware.admin.buildHeader, renderAdmin);
    router.post('/api/admin/plugins/ai-moderation/save', middleware.admin.buildHeader, handleSaveSettings);
}

function renderAdmin(req, res) {
    res.render('admin/plugins/ai-moderation', {
        title: 'AI Moderation Settings',
        csrf_token: req.csrfToken ? req.csrfToken() : ''
    });
}

async function handleSaveSettings(req, res) {
    try {
        if (!req.uid) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        const isAdmin = await require.main.require('./src/user').isAdministrator(req.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const settingsData = req.body;
        await settings.saveSettings(settingsData);
        
        // ModerationLoggerの設定を更新
        moderationLogger.updateConfig({
            logRetentionDays: settingsData.logRetentionDays,
            enableContentHashing: settingsData.enableContentHashing
        });

        logger.info('[ai-moderation] Settings saved via POST by user', { uid: req.uid });
        res.json({ success: true });
    } catch (error) {
        logger.error('[ai-moderation] Failed to save settings via POST', { error: error.message });
        res.status(500).json({ error: error.message });
    }
}

function setupSocketHandlers() {
    // 管理画面用のSocket.IOイベントハンドラ
    socketPlugins['ai-moderation'] = {
        // 設定の取得
        getSettings: async function(socket, data, callback) {
            try {
                if (!socket.uid) {
                    return callback(new Error('Not logged in'));
                }

                const isAdmin = await require.main.require('./src/user').isAdministrator(socket.uid);
                if (!isAdmin) {
                    return callback(new Error('Not authorized'));
                }

                const settingsData = await settings.getSettings();
                callback(null, settingsData);
            } catch (error) {
                logger.error('[ai-moderation] Failed to get settings', { error: error.message });
                callback(error);
            }
        },

        // 設定の保存
        saveSettings: async function(socket, data, callback) {
            try {
                if (!socket.uid) {
                    return callback(new Error('Not logged in'));
                }

                const isAdmin = await require.main.require('./src/user').isAdministrator(socket.uid);
                if (!isAdmin) {
                    return callback(new Error('Not authorized'));
                }

                await settings.saveSettings(data);
                
                // ModerationLoggerの設定を更新
                moderationLogger.updateConfig({
                    logRetentionDays: data.logRetentionDays,
                    enableContentHashing: data.enableContentHashing
                });

                logger.info('[ai-moderation] Settings saved by user', { uid: socket.uid });
                callback(null);
            } catch (error) {
                logger.error('[ai-moderation] Failed to save settings', { error: error.message });
                callback(error);
            }
        },

        // API接続テスト
        testConnection: async function(socket, data, callback) {
            try {
                if (!socket.uid) {
                    return callback(new Error('Not logged in'));
                }

                const isAdmin = await require.main.require('./src/user').isAdministrator(socket.uid);
                if (!isAdmin) {
                    return callback(new Error('Not authorized'));
                }

                const result = await apiFactory.testProvider(data.provider, data.apiKey);
                callback(null, result);
            } catch (error) {
                logger.error('[ai-moderation] Connection test failed', { error: error.message });
                callback(error);
            }
        },

        // クリーンアップ実行
        runCleanup: async function(socket, data, callback) {
            try {
                if (!socket.uid) {
                    return callback(new Error('Not logged in'));
                }

                const isAdmin = await require.main.require('./src/user').isAdministrator(socket.uid);
                if (!isAdmin) {
                    return callback(new Error('Not authorized'));
                }

                const result = await moderationLogger.performCleanup();
                logger.info('[ai-moderation] Manual cleanup executed by user', { 
                    uid: socket.uid, 
                    cleaned: result.cleaned 
                });
                
                callback(null, result);
            } catch (error) {
                logger.error('[ai-moderation] Cleanup failed', { error: error.message });
                callback(error);
            }
        },

        // 統計情報の取得
        getStats: async function(socket, data, callback) {
            try {
                if (!socket.uid) {
                    return callback(new Error('Not logged in'));
                }

                const isAdmin = await require.main.require('./src/user').isAdministrator(socket.uid);
                if (!isAdmin) {
                    return callback(new Error('Not authorized'));
                }

                const stats = await moderationLogger.getLogStats(null, 30); // 30日間の統計
                callback(null, stats);
            } catch (error) {
                logger.error('[ai-moderation] Failed to get stats', { error: error.message });
                callback(error);
            }
        },

        // システムステータスの取得
        getSystemStatus: async function(socket, data, callback) {
            try {
                if (!socket.uid) {
                    return callback(new Error('Not logged in'));
                }

                const isAdmin = await require.main.require('./src/user').isAdministrator(socket.uid);
                if (!isAdmin) {
                    return callback(new Error('Not authorized'));
                }

                const status = {
                    circuitBreaker: contentAnalyzer.circuitBreaker.getState(),
                    lastCleanup: null // TODO: 実装
                };

                callback(null, status);
            } catch (error) {
                logger.error('[ai-moderation] Failed to get system status', { error: error.message });
                callback(error);
            }
        }
    };

    logger.info('[ai-moderation] Socket handlers registered');
}

module.exports = plugin;