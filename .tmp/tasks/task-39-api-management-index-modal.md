# Task 39: APIトークン一覧の表示

## 概要

ユーザーが作成したAPIトークンの一覧をモーダルで表示する機能を実装する。既存のTask 38で作成したサイドバーメニューから呼び出され、トークンの詳細情報や管理操作への入り口を提供する。

## 要件

- モーダルダイアログでAPIトークンの一覧を表示
- トークン名、作成日時、最終使用日時を表示
- 各トークンに対してアクション（編集・削除）ボタンを提供
- WebSocket通信を使用してデータを取得
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
    // 各トークンに削除ボタンを配置
    // 空状態の制御
};

/**
 * Handle token deletion
 * @param {string} tokenId - Token ID
 */
APITokens.handleTokenDelete = function(tokenId) {
    // 削除確認ダイアログ
    // WebSocket通信で削除実行
    // リスト更新
};
```

### CSSスタイル

Bootstrapを使う

### WebSocketハンドラー拡張
```javascript
// library.js - 既存のsockets.apiTokens.getを使用
// シンプルなトークン情報のみ取得（id, name, created_at）
```

## 国際化対応

### 追加予定の翻訳キー
```json
// languages/ja/caiz.json
{
    "your-api-tokens": "あなたのAPIトークン",
    "no-tokens-description": "まだAPIトークンを作成していません。",
    "create-first-token": "最初のトークンを作成",
    "token-created": "作成日時",
    "delete-token": "削除"
}
```

## 技術的考慮事項

### データ構造
```javascript
// APIトークンオブジェクトの構造（簡略版）
const tokenObject = {
    id: "string",           // トークンID
    name: "string",         // トークン名
    created_at: "timestamp" // 作成日時
};
```

### セキュリティ考慮事項

- 完全なトークン値は表示しない
- ユーザー認証の厳密なチェック
- 他のユーザーのトークン情報の漏洩防止