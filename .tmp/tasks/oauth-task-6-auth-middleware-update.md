# OAuth Task 6: 認証ミドルウェア更新

## 概要

既存のBearer Token認証システム（simple-auth.js）とOAuth2認証システムを統合し、両方の認証方式をサポートする統一された認証ミドルウェアを実装します。既存のAPIトークンは破棄し、OAuth2 Device Authorization Grant で発行されたトークンでの認証のみ可能にします。

## 実装対象

### 1. 統合認証ミドルウェア (lib/oauth-auth.js)

OAuth2トークンとAPIトークンの両方をサポートする認証ミドルウェアを新規作成します。

#### インターフェース

```javascript
class OAuthAuthenticator {
    /**
     * 統合認証ミドルウェア
     * APIトークンとOAuth2トークンの両方をサポート
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object  
     * @param {Function} next - Express next function
     * @returns {Promise<void>}
     */
    static async authenticate(req, res, next);
    
    /**
     * OAuth2アクセストークン検証
     * @param {string} accessToken - OAuth2アクセストークン
     * @returns {Promise<Object>} 認証情報 { userId, clientId, scopes, type: 'oauth2' }
     */
    static async validateOAuth2Token(accessToken);
    
    /**
     * APIトークン検証（下位互換性）
     * @param {string} apiToken - 既存APIトークン
     * @returns {Promise<Object>} 認証情報 { userId, type: 'api' }
     */
    static async validateAPIToken(apiToken);
    
    /**
     * Bearer Token抽出
     * @param {string} authHeader - Authorization ヘッダー
     * @returns {string|null} 抽出されたトークン
     */
    static extractBearerToken(authHeader);
    
    /**
     * 401 Unauthorized応答送信
     * @param {Object} res - Express response object
     * @param {string} errorDescription - エラー詳細（オプション）
     * @returns {void}
     */
    static sendUnauthorized(res, errorDescription);
}
```

### 2. 既存認証モジュール更新 (lib/simple-auth.js)

既存のsimple-auth.jsを更新して、統合認証ミドルウェアを使用するように変更します。

#### 更新内容

```javascript
// 旧実装
const requireAuth = (req, res, next) => {
    // APIトークンのみサポート
};

// 新実装  
const requireAuth = (req, res, next) => {
    return OAuthAuthenticator.authenticate(req, res, next);
};
```

### 3. 認証情報コンテキスト管理

認証成功後のリクエストオブジェクトに認証情報を添付するコンテキスト管理を実装します。

#### コンテキスト構造

```javascript
// req.auth に以下の情報を設定
req.auth = {
    userId: 123,              // NodeBB User ID
    type: 'oauth2' | 'api',  // 認証方式
    clientId: 'mcp-client',  // OAuth2の場合のみ
    scopes: ['mcp:read'],    // OAuth2の場合のみ  
    token: 'original-token', // 元のトークン（監査ログ用）
    authenticatedAt: Date.now()
};
```

## 実装詳細

### 認証フロー

1. **Bearer Token抽出**: Authorization ヘッダーから `Bearer <token>` を抽出
2. **トークン形式判別**: トークンの特徴からOAuth2トークンかAPIトークンかを判別
3. **適切な検証**: 判別結果に基づいて適切な検証メソッドを呼び出し
4. **コンテキスト設定**: 認証成功時に `req.auth` に認証情報を設定
5. **エラーハンドリング**: 認証失敗時の統一されたエラー応答

### トークン形式判別ロジック

```javascript
// OAuth2トークン: Base64URL形式、32バイト（43文字程度）
// APIトークン: 既存形式（UUIDベースなど）

static determineTokenType(token) {
    // OAuth2 access tokenの特徴：base64url, 固定長
    if (/^[A-Za-z0-9_-]{43,}$/.test(token) && token.length >= 43) {
        return 'oauth2';
    }
    
    // APIトークンの特徴：既存のフォーマット
    return 'api';
}
```

### エラー応答の統一

OAuth2で統一されたエラー応答形式を提供します。

```javascript
// 401 Unauthorized応答（OAuth2準拠）
res.status(401).set({
    'WWW-Authenticate': 'Bearer realm="MCP API", error="invalid_token"',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache'
}).json({
    error: 'unauthorized',
    error_description: 'Invalid or expired token'
});
```

## セキュリティ考慮事項

### 1. トークン検証の破棄

- APIトークンの検証ロジックは破棄

### 2. 下位互換性
- 既存のAPIトークンは破棄

### 3. 監査ログ

- 認証試行と成功/失敗の記録
- 使用されたトークンタイプの記録

## 実装ファイル

### 新規作成
- `lib/oauth-auth.js` - 統合認証ミドルウェア

### 更新対象  
- `lib/simple-auth.js` - 統合認証ミドルウェア使用に変更
- `routes/mcp.js` - 更新された認証ミドルウェア使用（必要に応じて）

## テスト観点

### 正常系
1. OAuth2アクセストークンでの認証成功
2. 既存APIトークンでの認証不可
3. 適切なコンテキスト情報の設定

### 異常系
1. 無効なOAuth2トークンでの認証失敗
2. 期限切れOAuth2トークンでの認証失敗
3. APIトークンでの認証失敗
4. Authorization ヘッダー不正形式での認証失敗

### 互換性
1. 既存APIトークンの破棄
2. 新しいOAuth2トークン利用クライアントの正常動作
3. エラーレスポンス一貫性