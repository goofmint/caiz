# OAuth Task 6: 認証ミドルウェア更新

## 概要

統一認証ミドルウェア（unified-auth.js）を既存のMCP認証フローに統合し、legacy APIトークン認証を完全に廃止してOAuth2 Device Authorization Grant認証のみをサポートするシステムを構築します。
simple-auth.jsとの統合により、既存エンドポイントでのOAuth2認証への完全移行を実現します。

## 実装対象

### 1. 既存認証システムの移行 (lib/simple-auth.js)

現在のAPIトークン認証システムを完全廃止し、unified-auth.jsによるOAuth2認証システムへ移行します。

#### 現在の実装状況
- unified-auth.jsは既に実装済み（OAuth2専用認証ミドルウェア）
- RFC 6750準拠のセキュアな認証システム
- セキュアなトークンヒントとHMACベースのメタデータ管理

#### 更新が必要な箇所

```javascript
class SimpleAuth {
    /**
     * Legacy API token validation - 完全廃止
     * @deprecated OAuth2認証への移行により廃止
     */
    static async validateAPIToken(apiToken) {
        // 実装を削除し、常にnullを返す
        return null;
    }

    /**
     * Unified authentication middleware - OAuth2専用
     * OAuthAuthenticatorへの移行
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    static async authenticate(req, res, next) {
        // OAuthAuthenticator.authenticateに移行
    }
    
    /**
     * Optional authentication middleware - OAuth2専用
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    static async optionalAuth(req, res, next) {
        // OAuthAuthenticator.optionalAuthに移行
    }
}
```

### 2. MCPルートでの認証ミドルウェア統合 (routes/mcp.js)

MCPエンドポイントで統一認証ミドルウェアを使用するように更新します。

#### 更新内容

```javascript
// 旧実装 - simple-auth使用
const SimpleAuth = require('../lib/simple-auth');
router.use('/api/mcp', SimpleAuth.authenticate);

// 新実装 - unified-auth使用  
const OAuthAuthenticator = require('../lib/unified-auth');
router.use('/api/mcp', OAuthAuthenticator.authenticate);

// オプション認証が必要なエンドポイント
router.get('/api/mcp/public', OAuthAuthenticator.optionalAuth, handler);
```

### 3. セキュアな認証コンテキスト管理

unified-auth.jsによる強化された認証コンテキストが`req.auth`に設定されます。

#### 認証コンテキスト構造

```javascript
// OAuth2認証成功時のreq.authオブジェクト
req.auth = {
    userId: 123,                              // NodeBB User ID
    type: 'oauth2',                          // 認証方式（OAuth2のみ）
    clientId: 'mcp-client',                  // OAuth2クライアントID
    scopes: ['mcp:read', 'mcp:write'],       // 許可されたスコープ
    tokenHint: 'abcd1234...',               // セキュアなトークンヒント
    tokenHash: 'sha256_hash_value',         // HMACベーストークンハッシュ
    tokenExpiresAt: '2024-08-28T12:00:00Z', // ISO timestamp（有効期限）
    tokenExpirySeconds: 3600,               // 有効期限までの秒数
    authenticatedAt: '2024-08-28T11:00:00Z', // 認証時刻（ISO timestamp）
    username: 'user123',                     // NodeBBユーザー名
    email: 'user@example.com',              // ユーザーメールアドレス
    displayname: 'Display Name'             // 表示名
};
```

## 実装詳細

### 統一認証フロー

1. **Bearer Token抽出**: 正規表現による堅牢なトークン抽出（複数スペース対応）
2. **OAuth2検証**: 統一認証ミドルウェアによるOAuth2専用トークン検証
3. **安全なメタデータ生成**: HMACベーストークンハッシュとセキュアなヒント作成
4. **コンテキスト設定**: 強化された認証情報を`req.auth`に設定
5. **RFC 6750準拠エラー**: 適切なHTTPステータスとWWW-Authenticateヘッダー

### Legacy API認証の完全廃止

```javascript
// simple-auth.js内のLegacy実装廃止
class SimpleAuth {
    static async validateAPIToken(apiToken) {
        // 完全廃止 - 常にnullを返す
        winston.verbose('[mcp-server] API token validation is deprecated and disabled');
        return null;
    }
}
```

### RFC 6750準拠エラーレスポンス

unified-auth.jsによる標準準拠エラーハンドリング：

```javascript
// 400 Bad Request - invalid_request
{
    error: 'invalid_request',
    error_description: 'Missing or malformed Authorization header'
}

// 401 Unauthorized - invalid_token  
{
    error: 'invalid_token',
    error_description: 'The access token provided is invalid or expired'
}

// 403 Forbidden - insufficient_scope
{
    error: 'insufficient_scope', 
    required_scopes: ['mcp:admin']
}
```

## セキュリティ強化

### 1. トークンセキュリティ向上

- 生のBearerトークンをメモリに保持しない設計
- HMAC-SHA256によるセキュアなトークンハッシュ化
- 暗号学的に安全な32バイトサーバーシークレット

### 2. 安全な日付処理

- トークン有効期限の堅牢な検証
- NaN日付の防止とフォールバック値の適用
- 複数日付形式への対応（数値、ISO文字列、数値文字列）

### 3. 監査とロギング

- 認証成功/失敗の詳細ログ
- トークンヒントによる安全な監査証跡
- セキュリティイベントの追跡可能性

## 実装ファイル

### 更新対象
- `plugins/nodebb-plugin-mcp-server/lib/simple-auth.js` - legacy API認証廃止、unified-auth統合
- `plugins/nodebb-plugin-mcp-server/routes/mcp.js` - 認証ミドルウェアの統合適用

### 既存実装（変更なし）
- `plugins/nodebb-plugin-mcp-server/lib/unified-auth.js` - 統一認証ミドルウェア（実装済み）

## テスト観点

### 正常系
1. OAuth2アクセストークンでの認証成功とセキュアなメタデータ生成
2. 強化された`req.auth`コンテキストの適切な設定
3. RFC 6750準拠のエラーレスポンス
4. 安全な日付処理による堅牢な有効期限管理

### 異常系
1. Legacy APIトークンでの認証完全拒否
2. 無効・期限切れOAuth2トークンでの適切なエラー応答
3. 不正形式Authorization ヘッダーでのinvalid_request応答
4. NaN日付・無効タイムスタンプの安全な処理

### セキュリティ
1. 生のBearerトークンがメモリに残存しないこと
2. HMACベーストークンハッシュの正確性
3. トークンヒントによる安全な監査ログ
4. エラーレスポンスでのセキュリティ情報漏洩防止

### 移行確認
1. 既存MCPエンドポイントでのOAuth2認証動作
2. simple-auth.js経由での統一認証ミドルウェア利用
3. legacy認証の完全無効化
4. 後方互換性のないAPI認証の適切な拒否