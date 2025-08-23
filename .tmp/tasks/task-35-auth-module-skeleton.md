# タスク35: 認証モジュール骨子

## 概要
Bearer token抽出と401レスポンス送出機能を共通化し、認証処理のアーキテクチャを整備します。複数のエンドポイントで認証が必要になることを見据えて、再利用可能な認証ミドルウェアとユーティリティ関数群を設計します。

## 目的
- 認証処理の共通化によるコードの重複削除
- 一貫性のある認証エラー処理の実現
- 将来の認証機能拡張に対応できるアーキテクチャの構築
- Express middlewareパターンによる認証の簡素化

## アーキテクチャ設計

### 認証フローの標準化
```
1. Bearer token抽出
2. トークン形式の基本検証
3. JWT署名検証（将来実装）
4. スコープ検証（将来実装）
5. セッション情報の構築
6. 認証失敗時の標準化された401レスポンス
```

### ミドルウェア設計パターン
```javascript
// 使用例
router.get('/api/mcp/session', requireAuth(['mcp:read']), (req, res) => {
    // req.auth に認証情報が設定される
    res.json(req.auth);
});
```

## インターフェース設計

### 拡張ファイル: `lib/auth.js`
既存の認証クラスを拡張し、ミドルウェア機能を追加します。

```javascript
/**
 * Authentication middleware for MCP endpoints
 * Provides consistent authentication handling across all protected routes
 */
class MCPAuth {
    // 既存メソッドは維持
    
    /**
     * Create authentication middleware
     * @param {Array<string>} requiredScopes - Required OAuth scopes
     * @param {Object} options - Middleware options
     * @returns {Function} Express middleware function
     */
    static requireAuth(requiredScopes = [], options = {}) {
        // Express middleware that handles authentication
        // Sets req.auth on success, calls send401Response on failure
        // Implementation details will be added in next phase
    }
    
    /**
     * Create optional authentication middleware
     * @param {Object} options - Middleware options
     * @returns {Function} Express middleware function
     */
    static optionalAuth(options = {}) {
        // Express middleware that attempts authentication but doesn't fail on missing token
        // Sets req.auth if token is valid, continues without it if no token provided
        // Implementation details will be added in next phase
    }
    
    /**
     * Validate token scopes against required scopes
     * @param {Array<string>} tokenScopes - Scopes from JWT token
     * @param {Array<string>} requiredScopes - Required scopes for operation
     * @returns {boolean} True if token has sufficient scopes
     */
    static validateScopes(tokenScopes, requiredScopes) {
        // Validate that token contains all required scopes
        // Implementation details will be added in next phase
    }
    
    /**
     * Create standardized authentication context
     * @param {Object} tokenPayload - Decoded JWT payload
     * @returns {Object} Standardized auth context
     */
    static createAuthContext(tokenPayload) {
        // Create consistent auth object structure
        // Implementation details will be added in next phase
    }
}
```

### ミドルウェア使用パターン

#### 必須認証エンドポイント
```javascript
// /api/mcp/session - 認証必須
router.get('/api/mcp/session', 
    MCPAuth.requireAuth(['mcp:read']), 
    (req, res) => {
        res.json({
            user_id: req.auth.userId,
            username: req.auth.username,
            scopes: req.auth.scopes,
            expires_at: req.auth.expiresAt
        });
    }
);

// /api/mcp/tools - 管理者権限必須
router.get('/api/mcp/tools', 
    MCPAuth.requireAuth(['mcp:admin']), 
    (req, res) => {
        // 管理者のみアクセス可能
    }
);
```

#### オプション認証エンドポイント
```javascript
// /api/mcp/metadata - 認証オプション
router.get('/api/mcp/metadata', 
    MCPAuth.optionalAuth(), 
    (req, res) => {
        const metadata = getMetadata();
        
        // 認証済みの場合は追加情報を含める
        if (req.auth) {
            metadata.user_specific_info = getUserInfo(req.auth.userId);
        }
        
        res.json(metadata);
    }
);
```

## エラーハンドリングの標準化

### 認証エラーの分類
- `invalid_token`: トークンが無効または形式不正
- `insufficient_scope`: 必要なスコープが不足
- `expired_token`: トークンの有効期限切れ
- `invalid_issuer`: トークンの発行者が不正

### レスポンス形式の一貫性
```javascript
// 全ての401レスポンスは同一形式
{
    "error": "invalid_token",
    "error_description": "具体的なエラー内容",
    "realm": "MCP Server",
    "scope": "mcp:read mcp:write"
}
```

## 設定管理

### 認証設定の外部化
```javascript
// config/auth.js (将来作成)
const authConfig = {
    realm: 'MCP Server',
    defaultScopes: ['mcp:read', 'mcp:write'],
    tokenValidation: {
        issuer: 'https://caiz.test',
        audience: 'mcp-api',
        algorithms: ['RS256']
    },
    jwks: {
        uri: 'https://caiz.test/.well-known/jwks.json',
        cache: true,
        cacheMaxAge: 3600000 // 1 hour
    }
};
```

## セキュリティ考慮事項
- トークン情報のログ出力での機密性確保
- タイミング攻撃対策のための一定時間処理
- CORS設定との整合性確保
- レート制限との連携

## 参考資料
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [RFC 8693: OAuth 2.0 Token Exchange](https://tools.ietf.org/html/rfc8693)

## チェックボックス
- [ ] `lib/auth.js` に認証ミドルウェア機能追加（インターフェースのみ）
- [ ] 必須認証・オプション認証パターンの設計
- [ ] スコープ検証機能の設計
- [ ] 認証コンテキスト構造の標準化
- [ ] エラーハンドリングの統一