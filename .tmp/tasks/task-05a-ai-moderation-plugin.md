# タスク05a: AI投稿モデレーション専用プラグインの作成

## 概要

投稿時にAIを使用してコンテンツをモデレーションし、不適切な投稿に対して自動的にフラグを立てるシステムの基盤となる専用プラグインを作成する。

## 背景と目的

現在のnodebb-plugin-caizは複数の機能を含む大規模なプラグインとなっている。AIモデレーション機能は独立性が高く、他のコミュニティでも再利用可能な機能であるため、専用プラグインとして分離する。

## プラグイン設計

### プラグイン名
- `nodebb-plugin-ai-moderation`

### ディレクトリ構造
```
plugins/nodebb-plugin-ai-moderation/
├── plugin.json           # プラグイン定義
├── package.json          # パッケージ情報
├── library.js            # メインライブラリ
├── libs/
│   ├── api/
│   │   ├── openai.js     # OpenAI API統合
│   │   └── index.js      # APIファクトリー
│   ├── core/
│   │   ├── analyzer.js   # コンテンツ分析エンジン
│   │   ├── queue.js      # モデレーションキュー
│   │   └── settings.js   # 設定管理
│   └── hooks/
│       ├── posts.js      # 投稿関連フック
│       └── topics.js     # トピック関連フック
├── static/
│   ├── templates/
│   │   └── admin/
│   │       └── plugins/
│   │           └── ai-moderation.tpl
│   └── lib/
│       └── admin.js      # 管理画面JS
└── languages/
    ├── en-GB/
    │   └── ai-moderation.json
    └── ja/
        └── ai-moderation.json
```

## プラグイン定義（plugin.json）

```json
{
  "id": "nodebb-plugin-ai-moderation",
  "name": "NodeBB AI Moderation Plugin",
  "description": "AI-powered content moderation for NodeBB forums",
  "version": "1.0.0",
  "library": "./library.js",
  "hooks": [
    {
      "hook": "static:app.load",
      "method": "init"
    },
    {
      "hook": "filter:admin.header.build",
      "method": "addAdminNavigation"
    }
  ],
  "scripts": [
    "static/lib/admin.js"
  ],
  "templates": "static/templates",
  "languages": "languages",
  "acpScripts": [
    "static/lib/admin.js"
  ]
}
```

## パッケージ定義（package.json）

```json
{
  "name": "nodebb-plugin-ai-moderation",
  "version": "1.0.0",
  "description": "AI-powered content moderation for NodeBB forums",
  "main": "library.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/nodebb-plugin-ai-moderation"
  },
  "keywords": [
    "nodebb",
    "plugin",
    "ai",
    "moderation",
    "content-filtering"
  ],
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/yourusername/nodebb-plugin-ai-moderation/issues"
  },
  "homepage": "https://github.com/yourusername/nodebb-plugin-ai-moderation",
  "nbbpm": {
    "compatibility": "^4.0.0"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

## コア機能モジュール

### library.js（メインエントリーポイント）

```javascript
'use strict';

const plugin = {};
const logger = require.main.require('./src/logger');
const db = require.main.require('./src/database');

plugin.init = async function(params) {
    const { router, middleware } = params;
    
    logger.info('[ai-moderation] Initializing AI Moderation Plugin');
    
    // Initialize database schema
    await initializeDatabase();
    
    // Setup admin routes
    setupAdminRoutes(router, middleware);
    
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

async function initializeDatabase() {
    // Database initialization logic
}

function setupAdminRoutes(router, middleware) {
    router.get('/admin/plugins/ai-moderation', middleware.admin.buildHeader, renderAdmin);
    router.get('/api/admin/plugins/ai-moderation', middleware.admin.buildHeader, renderAdmin);
}

function renderAdmin(req, res) {
    res.render('admin/plugins/ai-moderation', {});
}

module.exports = plugin;
```

## データストレージ設計

### NodeBB データベース抽象化を使用

このプラグインはNodeBBのデータベース抽象化レイヤーを使用し、MongoDB、Redis、PostgreSQLなどのデータベースに対応します。

### 設定管理

```javascript
const meta = require.main.require('./src/meta');

// プラグイン設定の保存
async function saveSettings(settings) {
    // APIキーは暗号化して保存し、クライアントには送信しない
    const safeSettings = { ...settings };
    if (safeSettings.apiKey) {
        // NodeBBの暗号化機能を使用
        safeSettings.apiKey = await meta.settings.setEncrypted('ai-moderation', 'apiKey', safeSettings.apiKey);
        delete safeSettings.apiKey; // レスポンスから削除
    }
    
    await meta.settings.set('ai-moderation', safeSettings);
}

// プラグイン設定の取得
async function getSettings() {
    const settings = await meta.settings.get('ai-moderation');
    // APIキーは復号化（サーバーサイドのみ）
    const apiKey = await meta.settings.getEncrypted('ai-moderation', 'apiKey');
    return {
        ...settings,
        hasApiKey: !!apiKey, // クライアントには存在確認のみ送信
        // apiKeyの実際の値はサーバーサイドでのみ使用
    };
}

// APIキーの安全な取得（サーバーサイドのみ）
async function getApiKey() {
    return await meta.settings.getEncrypted('ai-moderation', 'apiKey');
}
```

### モデレーションログ管理

```javascript
const db = require.main.require('./src/database');

// モデレーションログのデータ構造
class ModerationLogger {
    async logModeration(data) {
        // ユニークIDを生成
        const logId = await db.incrObjectField('global', 'nextAiModerationLogId');
        
        // ログエントリを作成
        const logEntry = {
            id: logId,
            contentType: data.contentType, // 'topic' or 'post'
            contentId: data.contentId,
            cid: data.cid,
            uid: data.uid,
            content: data.content,
            apiProvider: data.apiProvider,
            apiResponse: JSON.stringify(data.apiResponse),
            score: data.score,
            categories: JSON.stringify(data.categories),
            actionTaken: data.actionTaken, // 'approved', 'flagged', 'rejected'
            reviewedBy: data.reviewedBy || null,
            reviewedAt: data.reviewedAt || null,
            createdAt: Date.now()
        };
        
        // ログエントリを保存
        await db.setObject(`ai-moderation:log:${logId}`, logEntry);
        
        // インデックス用のソート済みセットに追加
        await Promise.all([
            // 時系列インデックス
            db.sortedSetAdd('ai-moderation:logs:timestamp', logEntry.createdAt, logId),
            
            // カテゴリ別インデックス
            db.sortedSetAdd(`ai-moderation:logs:cid:${data.cid}`, logEntry.createdAt, logId),
            
            // ユーザー別インデックス
            db.sortedSetAdd(`ai-moderation:logs:uid:${data.uid}`, logEntry.createdAt, logId),
            
            // アクション別インデックス
            db.sortedSetAdd(`ai-moderation:logs:action:${data.actionTaken}`, logEntry.createdAt, logId),
            
            // コンテンツタイプ別インデックス
            db.sortedSetAdd(`ai-moderation:logs:type:${data.contentType}`, logEntry.createdAt, logId)
        ]);
        
        return logId;
    }
    
    async getLogsByCategory(cid, start = 0, stop = -1) {
        const logIds = await db.getSortedSetRevRange(`ai-moderation:logs:cid:${cid}`, start, stop);
        return await this.getLogsById(logIds);
    }
    
    async getLogsByUser(uid, start = 0, stop = -1) {
        const logIds = await db.getSortedSetRevRange(`ai-moderation:logs:uid:${uid}`, start, stop);
        return await this.getLogsById(logIds);
    }
    
    async getLogsByAction(action, start = 0, stop = -1) {
        const logIds = await db.getSortedSetRevRange(`ai-moderation:logs:action:${action}`, start, stop);
        return await this.getLogsById(logIds);
    }
    
    async getRecentLogs(start = 0, stop = 19) {
        const logIds = await db.getSortedSetRevRange('ai-moderation:logs:timestamp', start, stop);
        return await this.getLogsById(logIds);
    }
    
    async getLogsById(logIds) {
        if (!logIds || logIds.length === 0) return [];
        
        const keys = logIds.map(id => `ai-moderation:log:${id}`);
        const logs = await db.getObjects(keys);
        
        return logs.map(log => {
            if (log) {
                // JSONフィールドをパース
                log.apiResponse = log.apiResponse ? JSON.parse(log.apiResponse) : null;
                log.categories = log.categories ? JSON.parse(log.categories) : null;
                log.createdAt = parseInt(log.createdAt);
                log.reviewedAt = log.reviewedAt ? parseInt(log.reviewedAt) : null;
            }
            return log;
        }).filter(Boolean);
    }
    
    async getLogStats(cid = null, days = 30) {
        const since = Date.now() - (days * 24 * 60 * 60 * 1000);
        const baseKey = cid ? `ai-moderation:logs:cid:${cid}` : 'ai-moderation:logs:timestamp';
        
        // 指定期間内のログIDを取得
        const logIds = await db.getSortedSetRangeByScore(baseKey, since, Date.now());
        
        if (logIds.length === 0) {
            return { total: 0, approved: 0, flagged: 0, rejected: 0, avgScore: 0 };
        }
        
        const logs = await this.getLogsById(logIds);
        const stats = logs.reduce((acc, log) => {
            acc.total++;
            acc[log.actionTaken] = (acc[log.actionTaken] || 0) + 1;
            acc.totalScore += log.score || 0;
            return acc;
        }, { total: 0, approved: 0, flagged: 0, rejected: 0, totalScore: 0 });
        
        stats.avgScore = stats.total > 0 ? Math.round(stats.totalScore / stats.total) : 0;
        delete stats.totalScore;
        
        return stats;
    }
    
    async updateLogReview(logId, reviewedBy, action, reviewedAt = Date.now()) {
        const updates = {
            actionTaken: action,
            reviewedBy: reviewedBy,
            reviewedAt: reviewedAt
        };
        
        await db.setObject(`ai-moderation:log:${logId}`, updates);
        
        // アクションインデックスを更新
        const log = await db.getObject(`ai-moderation:log:${logId}`);
        if (log) {
            // 古いアクションインデックスから削除
            await db.sortedSetRemove(`ai-moderation:logs:action:${log.actionTaken}`, logId);
            // 新しいアクションインデックスに追加
            await db.sortedSetAdd(`ai-moderation:logs:action:${action}`, log.createdAt, logId);
        }
    }
}
```

### データベース互換性

この設計により、以下のNodeBBサポートデータベースで動作します：

- **MongoDB**: オブジェクトとソート済みセットのネイティブサポート
- **Redis**: 高速なソート済みセット操作
- **PostgreSQL**: NodeBBの抽象化レイヤー経由でサポート

### マイグレーション対応

既存のPostgreSQL直接実装からの移行パスを提供：

```javascript
// オプション: PostgreSQL直接実装からの移行
async function migrateFromDirectSql() {
    const db = require.main.require('./src/database');
    const logger = require.main.require('./src/logger');
    
    try {
        // 既存のPostgreSQLテーブルの存在確認
        const hasOldTables = await checkOldPostgresTables();
        
        if (hasOldTables) {
            logger.info('[ai-moderation] Migrating from PostgreSQL direct tables...');
            
            // データ移行ロジック
            await migrateSettingsData();
            await migrateModerationLogs();
            
            logger.info('[ai-moderation] Migration completed successfully');
        }
    } catch (error) {
        logger.error('[ai-moderation] Migration failed:', error);
        throw error;
    }
}
```

## 管理画面テンプレート

### static/templates/admin/plugins/ai-moderation.tpl

```html
<div class="acp-page-container">
    <div class="row">
        <div class="col-lg-9">
            <div class="panel panel-default">
                <div class="panel-heading">AI Moderation Settings</div>
                <div class="panel-body">
                    <form role="form" class="ai-moderation-settings">
                        <div class="form-group">
                            <label for="api-provider">API Provider</label>
                            <select class="form-control" id="api-provider" name="provider">
                                <option value="openai">OpenAI</option>
                                <option value="anthropic" disabled>Anthropic (Coming Soon)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="api-key">API Key</label>
                            <input type="password" id="api-key" name="apiKey" 
                                   class="form-control" placeholder="Enter your API key">
                        </div>
                        
                        <div class="form-group">
                            <label for="threshold-flag">Flag Threshold (0-100)</label>
                            <input type="number" id="threshold-flag" name="thresholdFlag" 
                                   class="form-control" min="0" max="100" value="70">
                            <p class="help-block">
                                Content scoring above this threshold will be flagged for review
                            </p>
                        </div>
                        
                        <div class="form-group">
                            <label for="threshold-reject">Auto-Reject Threshold (0-100)</label>
                            <input type="number" id="threshold-reject" name="thresholdReject" 
                                   class="form-control" min="0" max="100" value="90">
                            <p class="help-block">
                                Content scoring above this threshold will be automatically rejected
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <div class="col-lg-3">
            <div class="panel panel-default">
                <div class="panel-heading">Control Panel</div>
                <div class="panel-body">
                    <button class="btn btn-primary" id="save">
                        <i class="fa fa-save"></i> Save Settings
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
```

## 言語ファイル

### languages/ja/ai-moderation.json

```json
{
    "ai-moderation": "AIモデレーション",
    "settings": "設定",
    "api-provider": "APIプロバイダー",
    "api-key": "APIキー",
    "threshold-flag": "フラグしきい値",
    "threshold-reject": "自動拒否しきい値",
    "save-settings": "設定を保存",
    "settings-saved": "設定が保存されました",
    "settings-save-error": "設定の保存に失敗しました"
}
```

### languages/en-GB/ai-moderation.json

```json
{
    "ai-moderation": "AI Moderation",
    "settings": "Settings",
    "api-provider": "API Provider",
    "api-key": "API Key",
    "threshold-flag": "Flag Threshold",
    "threshold-reject": "Auto-Reject Threshold",
    "save-settings": "Save Settings",
    "settings-saved": "Settings saved successfully",
    "settings-save-error": "Failed to save settings"
}
```

## 利点と特徴

### 独立性
- 他のプラグインから完全に独立
- 単体でのインストール・アンインストールが可能
- 他のNodeBBインスタンスへの移植が容易

### 拡張性
- 複数のAIプロバイダーをサポート可能な設計
- カスタムルールの追加が容易
- WebHookやカスタムアクションの追加が可能

### パフォーマンス
- 非同期処理による高速レスポンス
- キューシステムによる負荷分散
- 効率的なデータベースインデックス

### 管理性
- 直感的な管理画面
- 詳細なログ記録
- 統計情報の可視化（将来実装）

## 次のステップ

この専用プラグインの基盤が完成したら、以下の機能を順次実装していく：

1. フィルターの設定（トピック作成、コメント作成、返信）
2. システム管理者用設定画面の詳細実装
3. モデレーション機能の実装
4. フラグ付き投稿の管理画面
5. ユーザーバン機能の統合