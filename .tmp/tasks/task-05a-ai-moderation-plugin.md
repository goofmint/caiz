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
├── languages/
│   ├── en-GB/
│   │   └── ai-moderation.json
│   └── ja/
│       └── ai-moderation.json
└── sql/
    └── schema.sql        # データベーススキーマ
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

## データベーススキーマ

### PostgreSQL用スキーマ（sql/schema.sql）

```sql
-- AI Moderation Plugin Schema

-- Settings table for global and per-category configuration
DROP TABLE IF EXISTS ai_moderation_settings;
CREATE TABLE IF NOT EXISTS ai_moderation_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Moderation log table
DROP TABLE IF EXISTS ai_moderation_log;
CREATE TABLE IF NOT EXISTS ai_moderation_log (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(20) NOT NULL, -- 'topic' or 'post'
    content_id INTEGER NOT NULL,
    cid INTEGER NOT NULL,
    uid INTEGER NOT NULL,
    content TEXT NOT NULL,
    api_provider VARCHAR(50),
    api_response JSONB,
    score INTEGER,
    categories JSONB,
    action_taken VARCHAR(20), -- 'approved', 'flagged', 'rejected'
    reviewed_by INTEGER,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_content ON ai_moderation_log(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_cid ON ai_moderation_log(cid);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_uid ON ai_moderation_log(uid);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_action ON ai_moderation_log(action_taken);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_created ON ai_moderation_log(created_at);
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