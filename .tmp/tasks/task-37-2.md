# Task 37.2: Authorization Endpoint実装

## 目的
OAuth 2.0 Authorization Code Flow + PKCE + Resource Indicatorsに対応した認可エンドポイント

## エンドポイント仕様
- **パス**: `GET /oauth/authorize`
- **認証**: NodeBBセッション必須
- **PKCE**: S256必須

## 必須パラメータ検証
```javascript
const requiredParams = {
    response_type: 'code',           // 固定値
    client_id: '存在する文字列',      // MCPクライアント識別
    redirect_uri: 'http://127.0.0.1:*', // ループバックのみ許可
    scope: 'mcp:read mcp:write',     // スペース区切り
    code_challenge: '43-128文字',    // Base64URL
    code_challenge_method: 'S256',   // 固定値
    state: '推奨文字列',              // CSRF保護
    resource: 'https://caiz.test'    // Resource Indicators
};
```

## 処理フロー
1. **パラメータ検証**
   - 必須パラメータ存在確認
   - `response_type=code`確認
   - `code_challenge_method=S256`確認
   - `redirect_uri`がループバック形式か確認
   - `resource`が自サーバーURLか確認

2. **NodeBBユーザー認証確認**
   - `req.session.uid`存在確認
   - 未ログイン → NodeBBログイン画面リダイレクト

3. **認可画面表示**
   - 要求スコープ表示
   - ユーザーに承認/拒否選択肢提示

4. **ユーザー承認処理**
   - Authorization code生成（10分有効）
   - code_challenge保存（PKCE検証用）
   - `redirect_uri?code=xxx&state=xxx`でリダイレクト

## 実装ファイル

### 1. `routes/oauth.js` (新規作成)
```javascript
'use strict';

const winston = require.main.require('winston');
const OAuthAuth = require('../lib/oauth-auth');

module.exports = function(router, middleware) {
    /**
     * OAuth Authorization Endpoint
     * GET /oauth/authorize
     */
    router.get('/oauth/authorize', middleware.authenticate, async (req, res) => {
        // パラメータ検証とフロー処理
    });
    
    /**
     * OAuth Authorization Form Submit
     * POST /oauth/authorize
     */
    router.post('/oauth/authorize', middleware.authenticate, async (req, res) => {
        // ユーザー承認/拒否処理
    });
};
```

### 2. `lib/oauth-auth.js` (新規作成)
```javascript
'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');

class OAuthAuth {
    static validateAuthParams(params) {
        // パラメータ検証ロジック
    }
    
    static generateAuthCode(userId, clientId, scopes, codeChallenge) {
        // Authorization code生成（10分有効）
    }
    
    static validateAuthCode(code, codeVerifier, clientId) {
        // PKCE検証とcode検証
    }
}

module.exports = OAuthAuth;
```

### 3. `templates/oauth/authorize.tpl` (新規作成)
```html
<!DOCTYPE html>
<html>
<head>
    <title>NodeBB MCP Server - 認可確認</title>
    <link rel="stylesheet" href="/assets/client.css">
</head>
<body>
    <div class="container">
        <h2>[[mcp-server:oauth.title]]</h2>
        
        <div class="panel panel-default">
            <div class="panel-body">
                <p>[[mcp-server:oauth.client_request]]<strong>{clientName}</strong></p>
                
                <h4>[[mcp-server:oauth.requested_permissions]]</h4>
                <ul>
                    <!-- BEGIN scopes -->
                    <li>[[mcp-server:scope.{scopes.scope}]]</li>
                    <!-- END scopes -->
                </ul>
                
                <form method="POST" action="/oauth/authorize">
                    <!-- 隠しフィールド（元のパラメータ） -->
                    <input type="hidden" name="response_type" value="{response_type}">
                    <input type="hidden" name="client_id" value="{client_id}">
                    <input type="hidden" name="redirect_uri" value="{redirect_uri}">
                    <input type="hidden" name="scope" value="{scope}">
                    <input type="hidden" name="code_challenge" value="{code_challenge}">
                    <input type="hidden" name="code_challenge_method" value="{code_challenge_method}">
                    <input type="hidden" name="state" value="{state}">
                    <input type="hidden" name="resource" value="{resource}">
                    
                    <div class="form-actions">
                        <button type="submit" name="action" value="approve" class="btn btn-primary">
                            [[mcp-server:oauth.approve]]
                        </button>
                        <button type="submit" name="action" value="deny" class="btn btn-default">
                            [[mcp-server:oauth.deny]]
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
```

### 4. `library.js`修正
```javascript
// OAuth routes setup
const oauthRoutes = require('./routes/oauth');
oauthRoutes(router, middleware);
```

### 5. 言語ファイル更新
`languages/*/mcp-server.json`に追加：
```json
{
    "oauth": {
        "title": "認可確認",
        "client_request": "以下のアプリケーションが権限を要求しています：",
        "requested_permissions": "要求されている権限:",
        "approve": "承認",
        "deny": "拒否"
    },
    "scope": {
        "mcp:read": "読み取りアクセス - コンテンツと情報の表示",
        "mcp:write": "書き込みアクセス - データの変更と作成",
        "mcp:admin": "管理者アクセス - システム設定の変更"
    }
}
```

## エラーハンドリング
- **無効パラメータ**: `redirect_uri`にerror=invalid_requestでリダイレクト
- **未認証**: NodeBBログイン画面へリダイレクト
- **ユーザー拒否**: `redirect_uri?error=access_denied&state=xxx`
- **サーバーエラー**: `redirect_uri?error=server_error&state=xxx`

## 検証方法
1. NodeBBにログイン
2. ブラウザで認可URL訪問:
```
https://caiz.test/oauth/authorize?response_type=code&client_id=test-client&redirect_uri=http://127.0.0.1:43110/callback&scope=mcp:read%20mcp:write&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&state=xyz&resource=https://caiz.test
```
3. 認可画面表示確認
4. 承認後のリダイレクト確認

## 完了条件
- [ ] パラメータ検証実装
- [ ] NodeBB認証連携実装
- [ ] 認可画面テンプレート作成
- [ ] Authorization code生成実装
- [ ] エラーハンドリング実装
- [ ] 言語ファイル更新
- [ ] ブラウザテストで正常フロー確認