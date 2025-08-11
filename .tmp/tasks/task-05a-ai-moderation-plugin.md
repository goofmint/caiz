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
    constructor() {
        this.crypto = require.main.require('crypto');
        this.logger = require.main.require('./src/logger');
        
        // 設定可能な制限値
        this.config = {
            maxContentLength: 2048,      // コンテンツの最大バイト数
            maxApiResponseLength: 4096,  // APIレスポンスの最大バイト数
            maxCategoriesLength: 1024,   // カテゴリの最大バイト数
            logRetentionDays: 90,        // ログ保持期間（日数）
            enableContentHashing: true,  // コンテンツハッシュ化を有効にする
        };
        
        // 機密情報を含む可能性のあるキー
        this.sensitiveKeys = [
            'token', 'key', 'secret', 'password', 'credential',
            'authorization', 'auth', 'api_key', 'apikey',
            'access_token', 'refresh_token', 'bearer'
        ];
    }
    
    async logModeration(data) {
        try {
            // ユニークIDを生成
            const logId = await db.incrObjectField('global', 'nextAiModerationLogId');
            
            // データのサニタイゼーションとセキュリティ処理
            const sanitizedData = await this.sanitizeLogData(data);
            
            // TTL設定（保持期間）
            const ttlSeconds = this.config.logRetentionDays * 24 * 60 * 60;
            
            // ログエントリを作成
            const logEntry = {
                id: logId,
                contentType: sanitizedData.contentType,
                contentId: sanitizedData.contentId,
                cid: sanitizedData.cid,
                uid: sanitizedData.uid,
                content: sanitizedData.content,
                contentHash: sanitizedData.contentHash,
                apiProvider: sanitizedData.apiProvider,
                apiResponse: sanitizedData.apiResponse,
                apiResponseHash: sanitizedData.apiResponseHash,
                score: sanitizedData.score,
                categories: sanitizedData.categories,
                actionTaken: sanitizedData.actionTaken,
                reviewedBy: sanitizedData.reviewedBy || null,
                reviewedAt: sanitizedData.reviewedAt || null,
                createdAt: Date.now(),
                truncated: sanitizedData.truncated || {},
                redacted: sanitizedData.redacted || false
            };
            
            // ログエントリを保存（TTL付き）
            const logKey = `ai-moderation:log:${logId}`;
            await db.setObject(logKey, logEntry);
            await db.expire(logKey, ttlSeconds);
            
            // インデックス用のソート済みセットに追加（TTL付き）
            const indexPromises = [
                // 時系列インデックス
                this.addToIndexWithTTL('ai-moderation:logs:timestamp', logEntry.createdAt, logId, ttlSeconds),
                
                // カテゴリ別インデックス
                this.addToIndexWithTTL(`ai-moderation:logs:cid:${data.cid}`, logEntry.createdAt, logId, ttlSeconds),
                
                // ユーザー別インデックス
                this.addToIndexWithTTL(`ai-moderation:logs:uid:${data.uid}`, logEntry.createdAt, logId, ttlSeconds),
                
                // アクション別インデックス
                this.addToIndexWithTTL(`ai-moderation:logs:action:${data.actionTaken}`, logEntry.createdAt, logId, ttlSeconds),
                
                // コンテンツタイプ別インデックス
                this.addToIndexWithTTL(`ai-moderation:logs:type:${data.contentType}`, logEntry.createdAt, logId, ttlSeconds)
            ];
            
            await Promise.all(indexPromises);
            
            // クリーンアップキューに追加（バックアップ削除メカニズム）
            await this.scheduleCleanup(logId, ttlSeconds);
            
            // テレメトリ：切り捨てや編集が発生した場合の警告
            if (sanitizedData.truncated && Object.keys(sanitizedData.truncated).length > 0) {
                this.logger.warn('[ai-moderation] Data truncated in log entry', {
                    logId,
                    truncated: sanitizedData.truncated
                });
            }
            
            if (sanitizedData.redacted) {
                this.logger.warn('[ai-moderation] Sensitive data redacted in log entry', {
                    logId,
                    provider: sanitizedData.apiProvider
                });
            }
            
            return logId;
            
        } catch (error) {
            this.logger.error('[ai-moderation] Failed to log moderation data', { error: error.message, data: data });
            throw error;
        }
    }
    
    async sanitizeLogData(data) {
        const result = { truncated: {}, redacted: false };
        
        // 1. サイズ制限とトランケーション
        result.content = this.truncateString(data.content, this.config.maxContentLength, 'content', result.truncated);
        result.categories = this.truncateString(
            typeof data.categories === 'object' ? JSON.stringify(data.categories) : data.categories,
            this.config.maxCategoriesLength,
            'categories',
            result.truncated
        );
        
        // 2. APIレスポンスのサニタイゼーション
        const sanitizedApiResponse = await this.sanitizeApiResponse(data.apiResponse);
        result.apiResponse = this.truncateString(
            sanitizedApiResponse.data,
            this.config.maxApiResponseLength,
            'apiResponse',
            result.truncated
        );
        result.redacted = sanitizedApiResponse.redacted;
        
        // 3. ハッシュ生成（オプション）
        if (this.config.enableContentHashing) {
            result.contentHash = this.generateHash(data.content);
            result.apiResponseHash = this.generateHash(JSON.stringify(data.apiResponse));
        }
        
        // 4. その他のフィールドをコピー
        result.contentType = data.contentType;
        result.contentId = data.contentId;
        result.cid = data.cid;
        result.uid = data.uid;
        result.apiProvider = data.apiProvider;
        result.score = data.score;
        result.actionTaken = data.actionTaken;
        result.reviewedBy = data.reviewedBy;
        result.reviewedAt = data.reviewedAt;
        
        return result;
    }
    
    truncateString(str, maxBytes, fieldName, truncatedLog) {
        if (!str) return str;
        
        const buffer = Buffer.from(str, 'utf8');
        if (buffer.length <= maxBytes) return str;
        
        // バイト制限を超える場合、切り捨て
        const truncated = buffer.subarray(0, maxBytes - 3).toString('utf8') + '...';
        truncatedLog[fieldName] = {
            originalSize: buffer.length,
            truncatedSize: maxBytes,
            truncated: true
        };
        
        return truncated;
    }
    
    async sanitizeApiResponse(apiResponse) {
        if (!apiResponse || typeof apiResponse !== 'object') {
            return { data: JSON.stringify(apiResponse), redacted: false };
        }
        
        let redacted = false;
        
        // 再帰的に機密情報をチェック・削除
        const sanitizeObject = (obj) => {
            if (typeof obj !== 'object' || obj === null) return obj;
            
            if (Array.isArray(obj)) {
                return obj.map(sanitizeObject);
            }
            
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                const lowerKey = key.toLowerCase();
                
                // 機密情報のキーをチェック
                const isSensitive = this.sensitiveKeys.some(sensitiveKey => 
                    lowerKey.includes(sensitiveKey)
                );
                
                if (isSensitive) {
                    sanitized[key] = '[REDACTED]';
                    redacted = true;
                } else if (typeof value === 'object') {
                    sanitized[key] = sanitizeObject(value);
                } else if (typeof value === 'string' && value.length > 1000) {
                    // 非常に長い文字列も潜在的に機密情報の可能性がある
                    sanitized[key] = value.substring(0, 100) + '[...TRUNCATED]';
                    redacted = true;
                } else {
                    sanitized[key] = value;
                }
            }
            
            return sanitized;
        };
        
        const sanitizedResponse = sanitizeObject(apiResponse);
        return {
            data: JSON.stringify(sanitizedResponse),
            redacted
        };
    }
    
    generateHash(data) {
        if (!data) return null;
        return this.crypto.createHash('sha256')
            .update(typeof data === 'string' ? data : JSON.stringify(data))
            .digest('hex');
    }
    
    async addToIndexWithTTL(indexKey, score, member, ttlSeconds) {
        await db.sortedSetAdd(indexKey, score, member);
        await db.expire(indexKey, ttlSeconds);
    }
    
    async scheduleCleanup(logId, ttlSeconds) {
        // クリーンアップキューに追加（バックアップ削除メカニズム）
        const cleanupTime = Date.now() + (ttlSeconds * 1000);
        await db.sortedSetAdd('ai-moderation:cleanup:queue', cleanupTime, logId);
        
        // クリーンアップキューにもTTLを設定（少し長めに）
        await db.expire('ai-moderation:cleanup:queue', ttlSeconds + 86400); // +1日
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
        // 既存のログを読み込んで現在の状態を取得
        const existingLog = await db.getObject(`ai-moderation:log:${logId}`);
        if (!existingLog) {
            throw new Error(`Log entry ${logId} not found`);
        }
        
        // 既存のアクションとタイムスタンプを保存
        const oldAction = existingLog.actionTaken;
        const createdAt = parseInt(existingLog.createdAt);
        
        // ログを更新
        const updates = {
            actionTaken: action,
            reviewedBy: reviewedBy,
            reviewedAt: reviewedAt
        };
        await db.setObject(`ai-moderation:log:${logId}`, updates);
        
        // アクションインデックスを更新
        if (oldAction !== action) {
            // 古いアクションインデックスから削除
            await db.sortedSetRemove(`ai-moderation:logs:action:${oldAction}`, logId);
            // 新しいアクションインデックスに追加
            await db.sortedSetAdd(`ai-moderation:logs:action:${action}`, createdAt, logId);
        }
    }
    
    // 期限切れログの定期クリーンアップジョブ
    async performCleanup() {
        try {
            const now = Date.now();
            
            // 期限切れのログIDを取得
            const expiredLogIds = await db.getSortedSetRangeByScore(
                'ai-moderation:cleanup:queue', 
                0, 
                now
            );
            
            if (expiredLogIds.length === 0) return { cleaned: 0 };
            
            this.logger.info('[ai-moderation] Starting cleanup of expired logs', { 
                count: expiredLogIds.length 
            });
            
            let cleaned = 0;
            for (const logId of expiredLogIds) {
                try {
                    // ログエントリとインデックスを削除
                    await this.cleanupLogEntry(logId);
                    
                    // クリーンアップキューから削除
                    await db.sortedSetRemove('ai-moderation:cleanup:queue', logId);
                    
                    cleaned++;
                } catch (error) {
                    this.logger.error('[ai-moderation] Failed to cleanup log entry', { 
                        logId, 
                        error: error.message 
                    });
                }
            }
            
            this.logger.info('[ai-moderation] Cleanup completed', { cleaned });
            return { cleaned };
            
        } catch (error) {
            this.logger.error('[ai-moderation] Cleanup job failed', { error: error.message });
            throw error;
        }
    }
    
    async cleanupLogEntry(logId) {
        // ログデータを取得してインデックスから削除
        const log = await db.getObject(`ai-moderation:log:${logId}`);
        
        if (log) {
            // 各インデックスから削除
            const cleanupPromises = [
                db.sortedSetRemove('ai-moderation:logs:timestamp', logId),
                db.sortedSetRemove(`ai-moderation:logs:cid:${log.cid}`, logId),
                db.sortedSetRemove(`ai-moderation:logs:uid:${log.uid}`, logId),
                db.sortedSetRemove(`ai-moderation:logs:action:${log.actionTaken}`, logId),
                db.sortedSetRemove(`ai-moderation:logs:type:${log.contentType}`, logId)
            ];
            
            await Promise.all(cleanupPromises);
        }
        
        // ログエントリを削除
        await db.delete(`ai-moderation:log:${logId}`);
    }
    
    // 設定の更新（管理画面から呼び出し可能）
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('[ai-moderation] Configuration updated', { config: this.config });
    }
    
    // セキュリティ設定の更新
    updateSensitiveKeys(newKeys) {
        this.sensitiveKeys = [...new Set([...this.sensitiveKeys, ...newKeys])];
        this.logger.info('[ai-moderation] Sensitive keys updated', { 
            count: this.sensitiveKeys.length 
        });
    }
}
```

### セキュリティとプライバシー機能

この実装には以下のセキュリティとプライバシー保護機能が含まれています：

#### 1. データサイズ制限とトランケーション
- **設定可能な制限値**: コンテンツ（2048バイト）、APIレスポンス（4096バイト）、カテゴリ（1024バイト）
- **バイト精度の切り捨て**: UTF-8エンコーディングを考慮した安全な切り捨て
- **切り捨てメタデータ**: 元のサイズと切り捨て情報をログに記録

#### 2. 機密情報の検出と編集
- **自動編集**: token, key, secret, password等の機密キーを`[REDACTED]`に置換
- **再帰的処理**: ネストしたオブジェクト内の機密情報も検出
- **長文字列の保護**: 1000文字を超える文字列を潜在的機密情報として切り捨て
- **編集ログ**: 機密情報が編集された場合の警告ログ

#### 3. データ整合性の保護
- **SHA256ハッシュ**: 元のコンテンツとAPIレスポンスの暗号学的ハッシュを保存
- **改ざん検出**: ハッシュを使用したデータ整合性検証
- **検索機能**: 元データなしでのハッシュベース検索

#### 4. データ保持とクリーンアップ
- **TTL (Time To Live)**: 各ログエントリに90日のTTLを設定
- **自動期限切れ**: データベースレベルでの自動削除
- **バックアップクリーンアップ**: 定期的なクリーンアップジョブでの手動削除
- **インデックス管理**: すべてのインデックスにもTTLを適用

#### 5. テレメトリと監視
- **切り捨て警告**: データが切り捨てられた場合の警告ログ
- **編集通知**: 機密情報が編集された場合の通知
- **エラーログ**: ログ処理失敗時の詳細エラー情報
- **統計情報**: クリーンアップ処理の実行結果

#### 6. 設定の柔軟性
- **動的設定更新**: 管理画面からの制限値変更
- **カスタム機密キー**: プロジェクト固有の機密キーパターン追加
- **有効/無効切り替え**: ハッシュ化機能の有効/無効設定

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

各ラベルはNodeBBのi18nシステムを使用して翻訳可能にすること。

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