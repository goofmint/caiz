# Task 39: APIトークン一覧の表示

## 概要

ユーザーが作成したAPIトークンの一覧をモーダルで表示する機能を実装する。既存のTask 38で作成したサイドバーメニューから呼び出され、トークンの詳細情報や管理操作への入り口を提供する。

## 要件

- モーダルダイアログでAPIトークンの一覧を表示
- トークン名、作成日時、最終使用日時、権限スコープを表示
- トークンの有効/無効状態を視覚的に表示
- 各トークンに対してアクション（編集・削除）ボタンを提供
- WebSocket通信を使用してデータを取得
- 空の状態（トークンが存在しない場合）の表示
- レスポンシブデザイン対応

## 実装予定箇所

### モーダルテンプレート
```html
<!-- templates/partials/modals/api-token-list.tpl -->
<div class="modal fade" id="api-token-list-modal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">[[caiz:api-tokens-management]]</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">[[caiz:your-api-tokens]]</h6>
                    <button class="btn btn-primary btn-sm" id="create-new-token">
                        <i class="fa fa-plus"></i> [[caiz:create-api-token]]
                    </button>
                </div>
                
                <!-- Loading state -->
                <div id="token-loading" class="text-center py-4">
                    <i class="fa fa-spinner fa-spin"></i> [[caiz:loading-tokens]]
                </div>
                
                <!-- Empty state -->
                <div id="token-empty-state" class="text-center py-4 d-none">
                    <i class="fa fa-key fa-3x text-muted mb-3"></i>
                    <h6>[[caiz:no-api-tokens]]</h6>
                    <p class="text-muted">[[caiz:no-tokens-description]]</p>
                    <button class="btn btn-outline-primary" id="create-first-token">
                        <i class="fa fa-plus"></i> [[caiz:create-first-token]]
                    </button>
                </div>
                
                <!-- Token list -->
                <div id="token-list-container" class="d-none">
                    <!-- Dynamic content will be inserted here -->
                </div>
            </div>
        </div>
    </div>
</div>
```

### JavaScript機能拡張
```javascript
// static/api-tokens.js に追加予定の関数

/**
 * Show API token list modal
 */
APITokens.showListModal = function() {
    // モーダルの表示と初期化
    // WebSocket通信でトークン一覧を取得
    // レンダリング処理
};

/**
 * Render token list in modal
 * @param {Array} tokens - Token data array
 */
APITokens.renderTokenList = function(tokens) {
    // トークンリストのHTMLを生成
    // 各トークンに対してアクションボタンを配置
    // 空状態の制御
};

/**
 * Format token data for display
 * @param {Object} token - Token object
 * @returns {Object} Formatted token data
 */
APITokens.formatTokenForDisplay = function(token) {
    // 日付のフォーマット
    // スコープの表示用変換
    // ステータスの視覚的表現
};

/**
 * Handle token list actions (edit, delete, toggle)
 * @param {string} action - Action type
 * @param {string} tokenId - Token ID
 */
APITokens.handleTokenAction = function(action, tokenId) {
    // アクションボタンのクリックハンドリング
    // 編集・削除・有効化/無効化の処理
};
```

### CSSスタイル
```css
/* static/style.scss に追加予定 */
#api-token-list-modal {
    .token-item {
        border: 1px solid var(--bs-border-color);
        border-radius: 0.375rem;
        padding: 1rem;
        margin-bottom: 0.75rem;
        
        &.token-disabled {
            opacity: 0.6;
            background-color: var(--bs-light);
        }
    }
    
    .token-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .token-meta {
        font-size: 0.875rem;
        color: var(--bs-secondary);
    }
    
    .token-actions {
        display: flex;
        gap: 0.25rem;
        
        .btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
        }
    }
    
    .token-scopes {
        margin-top: 0.5rem;
        
        .badge {
            margin-right: 0.25rem;
            margin-bottom: 0.25rem;
        }
    }
}
```

### WebSocketハンドラー拡張
```javascript
// library.js に追加予定の処理

sockets.apiTokens.getDetailed = async function(socket, data) {
    // ユーザー認証チェック
    if (!socket.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    
    // 詳細なトークン情報を取得
    // 実装予定: データベースから以下の情報を取得
    // - id, name, description
    // - created_at, last_used_at
    // - scopes, enabled status
    // - usage_count (使用回数)
    
    return mockDetailedTokens;
};

sockets.apiTokens.toggleEnabled = async function(socket, data) {
    // ユーザー認証チェック
    if (!socket.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    
    if (!data || !data.tokenId) {
        throw new Error('[[error:invalid-data]]');
    }
    
    // トークンの有効/無効を切り替え
    // 実装予定: データベースのenabled状態を更新
    
    return { success: true, enabled: !data.currentEnabled };
};
```

## 国際化対応

### 追加予定の翻訳キー
```json
// languages/ja/caiz.json
{
    "your-api-tokens": "あなたのAPIトークン",
    "no-tokens-description": "まだAPIトークンを作成していません。APIを使用するにはトークンが必要です。",
    "create-first-token": "最初のトークンを作成",
    "token-created": "作成日時",
    "token-last-used": "最終使用",
    "token-never-used": "未使用",
    "token-enabled": "有効",
    "token-disabled": "無効",
    "toggle-token": "有効/無効を切り替え",
    "edit-token": "編集",
    "delete-token": "削除",
    "token-scopes": "権限スコープ",
    "usage-count": "使用回数"
}
```

## 技術的考慮事項

### データ構造
```javascript
// APIトークンオブジェクトの構造
const tokenObject = {
    id: "string",           // トークンID
    name: "string",         // トークン名
    description: "string",  // 説明（オプション）
    token_preview: "string", // トークンのプレビュー（最初の4文字など）
    created_at: "timestamp", // 作成日時
    last_used_at: "timestamp", // 最終使用日時（nullの場合未使用）
    enabled: "boolean",     // 有効/無効状態
    scopes: ["array"],      // 権限スコープの配列
    usage_count: "number"   // 使用回数
};
```

### セキュリティ考慮事項

- 完全なトークン値は表示しない（プレビューのみ）
- ユーザー認証の厳密なチェック
- 他のユーザーのトークン情報の漏洩防止
- XSS対策のための適切なエスケープ処理

### UX考慮事項

- ローディング状態の適切な表示
- 空状態での明確な次のアクションガイド
- アクションボタンの誤操作防止
- モバイルデバイスでの使いやすさ確保