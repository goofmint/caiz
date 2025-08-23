# タスク34: 401とWWW-Authenticate

## 概要
未認証の`/api/mcp/session`エンドポイントに対して、適切な401 Unauthorizedレスポンスと`WWW-Authenticate`ヘッダーを返す機能を実装します。これにより、MCPクライアントが認証が必要であることを理解し、適切な認証フローを開始できます。

## 目的
- OAuth 2.0 Bearer Token認証の標準的な401レスポンス実装
- MCPクライアントによる認証フロー開始のサポート
- RFC 6750準拠のWWW-Authenticateヘッダー設定

## エンドポイント仕様

### `GET /api/mcp/session`

認証されたユーザーのセッション情報を返すエンドポイント。未認証の場合は401を返します。

#### 未認証時のレスポンス
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="MCP Server", scope="mcp:read mcp:write", error="invalid_token"
Content-Type: application/json

{
  "error": "unauthorized",
  "error_description": "Bearer token required for MCP session access",
  "realm": "MCP Server",
  "scope": "mcp:read mcp:write"
}
```

#### 認証済み時のレスポンス（将来実装）
```json
{
  "user_id": "12345",
  "username": "john_doe", 
  "scopes": ["mcp:read", "mcp:write"],
  "expires_at": "2024-12-31T23:59:59Z"
}
```

## インターフェース設計

### 新規ファイル: `lib/auth.js`
```javascript
/**
 * Authentication middleware and utilities for MCP server
 * Implements OAuth 2.0 Bearer Token authentication
 */
class MCPAuth {
    /**
     * Extract Bearer token from Authorization header
     * @param {Object} req - Express request object
     * @returns {string|null} Bearer token or null if not found
     */
    static extractBearerToken(req) {
        // Extract token from Authorization: Bearer <token> header
        // Implementation details will be added in next phase
    }
    
    /**
     * Generate WWW-Authenticate header for 401 responses
     * @param {Object} options - Authentication options
     * @returns {string} WWW-Authenticate header value
     */
    static generateWWWAuthenticateHeader(options = {}) {
        // Generate RFC 6750 compliant WWW-Authenticate header
        // Implementation details will be added in next phase
    }
    
    /**
     * Send 401 Unauthorized response with proper headers
     * @param {Object} res - Express response object
     * @param {Object} options - Error options
     */
    static send401Response(res, options = {}) {
        // Send standardized 401 response with WWW-Authenticate header
        // Implementation details will be added in next phase
    }
}
```

### 既存ファイル更新: `routes/mcp.js`
新しいエンドポイント `/api/mcp/session` を追加します。

```javascript
/**
 * MCP Session endpoint
 * GET /api/mcp/session
 */
router.get('/api/mcp/session', (req, res) => {
    // Check for Bearer token authentication
    // If no token or invalid token, return 401 with WWW-Authenticate
    // Implementation details will be added in next phase
});
```

## RFC 6750 準拠事項
- `WWW-Authenticate`ヘッダーの正しい形式
- `realm`パラメータでリソースサーバー識別
- `scope`パラメータで必要な権限の明示
- `error`パラメータで具体的なエラー種別の提供

## セキュリティ考慮事項
- Bearer tokenの安全な抽出と検証
- 認証エラー情報の適切な制限
- タイミング攻撃の防止
- ログ記録での機密情報の除外

## 参考資料
- [RFC 6750: The OAuth 2.0 Authorization Framework: Bearer Token Usage](https://tools.ietf.org/html/rfc6750)
- [RFC 7235: Hypertext Transfer Protocol (HTTP/1.1): Authentication](https://tools.ietf.org/html/rfc7235)

## チェックボックス
- [ ] `lib/auth.js` ファイルの作成（インターフェースのみ）
- [ ] `routes/mcp.js` に `/api/mcp/session` エンドポイント追加
- [ ] 401レスポンス形式の定義
- [ ] WWW-Authenticateヘッダーの実装
- [ ] ドキュメントの整備