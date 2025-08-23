# Task 32: MCPサーバープラグインの雛形作成

## 概要
NodeBBでMCPサーバー機能を提供するプラグインの基本構造を作成する。最初のステップとして`/mcp/health`エンドポイントのみを実装し、MCPサーバーとしての疎通確認を行えるようにする。

## 要件
- NodeBBプラグインとしてMCPサーバー機能を提供
- `/mcp/health`エンドポイントで健康状態を確認
- MCPプロトコルの基本構造に準拠
- 将来的な機能拡張に対応できる設計

## プラグイン構造

### ディレクトリ構成
```
plugins/nodebb-plugin-mcp-server/
├── plugin.json                 # プラグイン定義
├── library.js                 # メインロジック
├── package.json                # NPMパッケージ定義
├── routes/
│   └── mcp.js                  # MCPエンドポイント定義
├── lib/
│   ├── server.js               # MCPサーバー実装
│   └── health.js               # ヘルスチェック機能
└── templates/
    └── admin/
        └── plugins/
            └── mcp-server.tpl  # 管理画面テンプレート
```

## エンドポイント設計

### GET /mcp/health
MCPサーバーの健康状態を確認するエンドポイント

**レスポンス例:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z",
  "capabilities": {
    "tools": false,
    "prompts": false,
    "resources": false
  }
}
```

## コードインターフェース

### library.js
```javascript
'use strict';

const plugin = {};

/**
 * Plugin initialization
 * @param {Object} params - NodeBB initialization parameters
 */
plugin.init = async function(params) {
    // MCPサーバーの初期化処理
    // ルートの登録とミドルウェアの設定
};

/**
 * Add admin navigation menu
 * @param {Object} header - Admin header object
 * @param {Function} callback - Callback function
 */
plugin.addAdminMenu = function(header, callback) {
    // 管理画面メニューの追加
};

module.exports = plugin;
```

### routes/mcp.js
```javascript
'use strict';

const express = require('express');
const router = express.Router();

/**
 * Health check endpoint for MCP server
 * GET /mcp/health
 */
router.get('/health', async (req, res) => {
    // MCPサーバーの健康状態を返す
});

module.exports = router;
```

### lib/server.js
```javascript
'use strict';

class MCPServer {
    constructor() {
        // MCPサーバーの初期化
    }
    
    /**
     * Get server health status
     * @returns {Object} Health status information
     */
    async getHealth() {
        // サーバーの健康状態を取得
    }
    
    /**
     * Get server capabilities
     * @returns {Object} Server capabilities
     */
    getCapabilities() {
        // サーバーの機能一覧を返す
    }
}

module.exports = MCPServer;
```

### lib/health.js
```javascript
'use strict';

const HealthChecker = {
    /**
     * Check overall system health
     * @returns {Object} Health check results
     */
    async checkHealth() {
        // システム全体の健康状態をチェック
    },
    
    /**
     * Check NodeBB database connectivity
     * @returns {boolean} Database health status
     */
    async checkDatabase() {
        // データベース接続状態を確認
    },
    
    /**
     * Get system version information
     * @returns {Object} Version information
     */
    getVersionInfo() {
        // バージョン情報を取得
    }
};

module.exports = HealthChecker;
```

## 設定項目

### plugin.json
- プラグインメタデータ
- フック定義
- 静的ファイル設定
- ルート設定

### 管理画面設定
- MCPサーバーの有効/無効切り替え
- エンドポイントの設定
- ログレベル設定

## 技術仕様

### 依存関係
- NodeBB core modules
- Express.js (ルーティング)
- 標準ライブラリのみ使用

### セキュリティ考慮事項
- リクエスト検証
- レート制限準備
- エラーハンドリング

### パフォーマンス
- 軽量な実装
- メモリ使用量の最小化
- 非同期処理の活用

## 次のステップ
1. 基本プラグイン構造の実装
2. `/mcp/health`エンドポイントの実装
3. 管理画面の追加
4. テストとドキュメント整備