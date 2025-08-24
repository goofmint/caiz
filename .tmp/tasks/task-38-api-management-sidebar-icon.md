# Task 38: ユーザー情報（sidebar/right）にAPIトークンメニューアイコンの追加

## 概要

NodeBBのユーザー情報サイドバー（右側）にAPIトークン管理のメニューアイコンを追加する。ユーザーがAPIトークンに簡単にアクセスできるUIを提供する。

## 要件

- ユーザー情報サイドバー（右側）にAPIトークンのアイコンボタンを追加
- ログインユーザーのみ表示
- アイコンクリックでAPIトークン管理画面に遷移
- 既存のサイドバーUIと統一感のあるデザイン

## 実装予定箇所

### テンプレートファイル
```html
<!-- templates/partials/sidebar-right.tpl -->
<!-- 既存のユーザー情報セクションに以下を追加 -->
<div class="sidebar-menu-item">
    <a href="#" class="api-token-link" data-ajaxify="false">
        <i class="fa fa-key" aria-hidden="true"></i>
        <span>[[caiz:api-tokens]]</span>
    </a>
</div>
```

### CSSスタイル
```css
/* static/lib/main.css or appropriate stylesheet */
.api-token-link {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    color: var(--bs-body-color);
    text-decoration: none;
}

.api-token-link:hover {
    background-color: var(--bs-secondary-bg);
    border-radius: 4px;
}

.api-token-link i {
    margin-right: 8px;
    width: 16px;
}
```

### JavaScriptフック
```javascript
// static/lib/main.js
// サイドバー表示時にAPIトークンメニューの表示/非表示制御
$(document).ready(function() {
    if (app.user && app.user.uid) {
        $('.api-token-link').show();
    } else {
        $('.api-token-link').hide();
    }
});
```

### WebSocket通信（将来実装予定）
```javascript
// static/lib/main.js
// APIトークン管理のWebSocket通信
function loadAPITokens() {
    window.socket.emit('modules.apiTokens.get', {}, function(err, tokens) {
        if (err) {
            app.alertError(err.message);
            return;
        }
        displayAPITokens(tokens);
    });
}

function createAPIToken(tokenData) {
    window.socket.emit('modules.apiTokens.create', tokenData, function(err, result) {
        if (err) {
            app.alertError(err.message);
            return;
        }
        app.alertSuccess('[[caiz:api-token-created]]');
        loadAPITokens(); // リロード
    });
}

function deleteAPIToken(tokenId) {
    window.socket.emit('modules.apiTokens.delete', { tokenId: tokenId }, function(err, result) {
        if (err) {
            app.alertError(err.message);
            return;
        }
        app.alertSuccess('[[caiz:api-token-deleted]]');
        loadAPITokens(); // リロード
    });
}
```

### サーバーサイドWebSocketハンドラー（将来実装予定）
```javascript
// library.js
// WebSocketイベントハンドラーの登録
SocketPlugins.apiTokens = {
    get: function(socket, data, callback) {
        // ユーザー認証チェック
        if (!socket.uid) {
            return callback(new Error('[[error:not-logged-in]]'));
        }
        
        // APIトークン一覧を取得
        // 実装予定: データベースからトークン情報を取得
        callback(null, []);
    },
    
    create: function(socket, data, callback) {
        // ユーザー認証チェック
        if (!socket.uid) {
            return callback(new Error('[[error:not-logged-in]]'));
        }
        
        // APIトークン作成
        // 実装予定: トークン生成とデータベース保存
        callback(null, { success: true });
    },
    
    delete: function(socket, data, callback) {
        // ユーザー認証チェック
        if (!socket.uid) {
            return callback(new Error('[[error:not-logged-in]]'));
        }
        
        // APIトークン削除
        // 実装予定: トークン削除処理
        callback(null, { success: true });
    }
};
```

## 国際化対応

### 言語ファイル
```json
// languages/en-US/caiz.json
{
    "api-tokens": "API Tokens",
    "manage-api-tokens": "Manage API Tokens",
    "api-token-created": "API token created successfully",
    "api-token-deleted": "API token deleted successfully",
    "api-token-updated": "API token updated successfully"
}

// languages/ja/caiz.json  
{
    "api-tokens": "APIトークン",
    "manage-api-tokens": "APIトークン管理",
    "api-token-created": "APIトークンを作成しました",
    "api-token-deleted": "APIトークンを削除しました",
    "api-token-updated": "APIトークンを更新しました"
}
```

## 注意事項

- このタスクはUIのメニューアイコン追加のみ
- 実際のAPIトークン管理機能は別タスクで実装
- ユーザー権限チェックが必要
- レスポンシブデザインに対応する必要がある

## 関連タスク

- Task 39: APIトークン一覧の表示
- Task 40: APIトークンの作成、更新、削除