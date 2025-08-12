'use strict';

const plugin = {};
const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const privileges = require.main.require('./src/privileges');
const socketPlugins = require.main.require('./src/socket.io/plugins');

// コアモジュールの読み込み
const settings = require('./libs/core/settings');
const ContentAnalyzer = require('./libs/core/analyzer');
const apiFactory = require('./libs/api');
const postsHooks = require('./libs/hooks/posts');

// インスタンス
const contentAnalyzer = new ContentAnalyzer();

// NodeBBではフラグ作成に特別な権限は不要なため、権限付与処理は削除可能
// ただし、将来の拡張のために最小限のセットアップは残す

// フラグを作成するユーザーID（システムユーザー）
const FLAG_UID = 1;

plugin.init = async function(params) {
    const { router, middleware } = params;
    
    winston.info('[ai-moderation] Initializing AI Moderation Plugin');
    
    // Initialize database schema
    await initializeDatabase();
    
    // Setup admin routes
    setupAdminRoutes(router, middleware);
    
    // Setup socket handlers
    setupSocketHandlers();
    
    // NodeBBではフラグ作成に権限不要のため、権限付与処理は削除
    winston.info('[ai-moderation] AI Moderation Plugin initialized with flag UID:', FLAG_UID);
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
plugin.afterPostSave = postsHooks.afterPostSave;

// 新規カテゴリ作成時のフック（将来の拡張用に残す）
plugin.onCategoryCreate = async function(data) {
    const cid = data?.cid || data?.category?.cid;
    if (cid) {
        winston.info('[ai-moderation] New category created', { cid });
    }
};

winston.info('[ai-moderation] Hooks registered', {
    moderatePostCreate: typeof plugin.moderatePostCreate,
    moderatePostEdit: typeof plugin.moderatePostEdit,
    afterPostSave: typeof plugin.afterPostSave,
    onCategoryCreate: typeof plugin.onCategoryCreate
});

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
        getSettings: async function(socket, data) {
            await requireAdmin(socket);
            return settings.getSettings();
        },

        // 設定の保存
        saveSettings: async function(socket, data) {
            await requireAdmin(socket);
            
            await settings.saveSettings(data);
            winston.info('[ai-moderation] Settings saved by user', { uid: socket.uid });
            return { success: true };
        },

        // API接続テスト
        testConnection: async function(socket, data) {
            await requireAdmin(socket);
            return apiFactory.testProvider('openai', data.apiKey);
        }
    };

    winston.info('[ai-moderation] Socket handlers registered');
}

module.exports = plugin;