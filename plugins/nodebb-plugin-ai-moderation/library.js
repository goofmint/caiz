'use strict';

const plugin = {};
const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const socketPlugins = require.main.require('./src/socket.io/plugins');

// コアモジュールの読み込み
const settings = require('./libs/core/settings');
const ContentAnalyzer = require('./libs/core/analyzer');
const apiFactory = require('./libs/api');
const postsHooks = require('./libs/hooks/posts');
const topicsHooks = require('./libs/hooks/topics');

// インスタンス
const contentAnalyzer = new ContentAnalyzer();

plugin.init = async function(params) {
    const { router, middleware } = params;
    
    winston.info('[ai-moderation] Initializing AI Moderation Plugin');
    
    // Initialize database schema
    await initializeDatabase();
    
    // Setup admin routes
    setupAdminRoutes(router, middleware);
    
    // Setup socket handlers
    setupSocketHandlers();
    
    winston.info('[ai-moderation] AI Moderation Plugin initialized');
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
plugin.moderatePostCreate = postsHooks.moderatePostCreate;
plugin.moderatePostEdit = postsHooks.moderatePostEdit;
plugin.moderateTopicCreate = topicsHooks.moderateTopicCreate;
plugin.moderateTopicEdit = topicsHooks.moderateTopicEdit;

async function initializeDatabase() {
    try {
        // データベース初期化処理
        winston.info('[ai-moderation] Database initialized');
    } catch (error) {
        winston.error('[ai-moderation] Database initialization failed', { error: error.message });
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
        
        // 設定更新完了

        winston.info('[ai-moderation] Settings saved via POST by user', { uid: req.uid });
        res.json({ success: true });
    } catch (error) {
        winston.error('[ai-moderation] Failed to save settings via POST', { error: error.message });
        res.status(500).json({ error: error.message });
    }
}


// 管理者認証ヘルパー関数
async function requireAdmin(socket) {
    if (!socket.uid) {
        throw new Error('Not logged in');
    }

    const isAdmin = await require.main.require('./src/user').isAdministrator(socket.uid);
    if (!isAdmin) {
        throw new Error('Not authorized');
    }
}

function setupSocketHandlers() {
    // 管理画面用のSocket.IOイベントハンドラ
    socketPlugins['ai-moderation'] = {
        // 設定の取得
        getSettings: async function(socket, data, callback) {
            try {
                await requireAdmin(socket);
                const settingsData = await settings.getSettings();
                callback(null, settingsData);
            } catch (error) {
                winston.error('[ai-moderation] Failed to get settings', { error: error.message });
                callback(error);
            }
        },

        // 設定の保存
        saveSettings: async function(socket, data, callback) {
            try {
                await requireAdmin(socket);
                
                await settings.saveSettings(data);
                
                // 設定更新完了

                winston.info('[ai-moderation] Settings saved by user', { uid: socket.uid });
                callback(null);
            } catch (error) {
                winston.error('[ai-moderation] Failed to save settings', { error: error.message });
                callback(error);
            }
        },

        // API接続テスト
        testConnection: function(socket, data, callback) {
            winston.info('[ai-moderation] Connection test started', { 
                uid: socket.uid,
                arguments: Array.from(arguments).map((arg, i) => ({
                    index: i,
                    type: typeof arg,
                    value: i === 1 && arg && arg.apiKey ? { apiKey: arg.apiKey.substring(0, 7) + '...' } : 
                           typeof arg === 'function' ? '[Function]' : arg
                }))
            });
            
            // コールバックがない場合は最後の引数をコールバックとする
            if (typeof callback !== 'function' && typeof data === 'function') {
                callback = data;
                data = {};
            }
            
            if (typeof callback !== 'function') {
                winston.error('[ai-moderation] No callback function provided');
                return;
            }
            
            // 非同期処理を実行
            (async () => {
                try {
                    await requireAdmin(socket);
                    const result = await apiFactory.testProvider('openai', data.apiKey);
                    
                    winston.info('[ai-moderation] Connection test completed', { success: result.success });
                    callback(null, result);
                } catch (error) {
                    winston.error('[ai-moderation] Connection test failed', { error: error.message });
                    callback(error);
                }
            })();
        }
    };

    winston.info('[ai-moderation] Socket handlers registered');
}

module.exports = plugin;