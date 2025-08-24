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
    <a href="/user/{username}/api-tokens" class="api-token-link">
        <i class="fa fa-key" aria-hidden="true"></i>
        <span>API Tokens</span>
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

### ルーティング（将来実装予定）
```javascript
// library.js
// APIトークン管理画面へのルーティング設定
router.get('/user/:userslug/api-tokens', middleware.authenticate, renderAPITokens);

function renderAPITokens(req, res) {
    res.render('user/api-tokens', {
        title: 'API Tokens',
        userslug: req.params.userslug
    });
}
```

## 国際化対応

### 言語ファイル
```json
// languages/en-US/caiz.json
{
    "api-tokens": "API Tokens",
    "manage-api-tokens": "Manage API Tokens"
}

// languages/ja/caiz.json  
{
    "api-tokens": "APIトークン",
    "manage-api-tokens": "APIトークン管理"
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