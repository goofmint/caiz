# タスク37: 認証済セッション応答

## 概要
JWT検証が成功した場合に、`/api/mcp/session`エンドポイントが認証済みユーザーのセッション情報を200 OKステータスで返すレスポンス実装を行います。これによりMCPクライアントが認証状態を確認し、利用可能なリソースへのアクセス権限を把握できるようになります。

## 目的
- 認証済みユーザーへの適切なセッション情報提供
- JWTクレームからの必要情報抽出と標準化
- MCPプロトコルに準拠したセッションレスポンス形式の実装
- クライアント向けの明確な権限情報の提示

## エンドポイント仕様

### `GET /api/mcp/session`

認証されたユーザーのセッション情報を返すエンドポイント。

#### リクエスト
```http
GET /api/mcp/session HTTP/1.1
Host: caiz.test
Authorization: Bearer <valid_jwt_token>
```

#### 成功時レスポンス (200 OK)
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{
  "user_id": "12345",              // string; JWT 'sub'クレームから
  "username": "john_doe",
  "display_name": "John Doe",       // 'profile'スコープが必要
  "email": "john.doe@example.com",  // 'email'スコープが必要
  "scopes": ["mcp:read", "mcp:write"], // array; JWT 'scope'（スペース区切り）または'scp'から変換
  "expires_at": "2025-12-31T23:59:59Z", // RFC3339 UTC; JWT 'exp'から
  "issued_at": "2025-01-01T00:00:00Z",  // RFC3339 UTC; JWT 'iat'から
  "issuer": "https://caiz.test",        // JWT 'iss'から
  "audience": "mcp-api",                // JWT 'aud'から
  "token_type": "access_token",
  "token_id": "jti_abc123",             // JWT 'jti'から（デバッグ用途のみ）
  "session_id": "sess_6f8d9a2b",        // サーバー生成ID; jtiとは別
  "session_info": {
    "created_at": "2025-01-01T00:00:00Z",    // RFC3339 UTC
    "last_activity": "2025-01-01T12:00:00Z", // RFC3339 UTC
    "ip_address": "203.0.113.10",            // ドキュメント用IPアドレス（RFC5737）
    "user_agent": "MCP-Client/1.0"
  },
  "capabilities": {
    "tools": ["search", "read", "write"],
    "prompts": ["code_review", "documentation"],
    "resources": ["files", "database"]
  }
}
```

#### エラー時レスポンス

- **401 Unauthorized**（無効/欠落トークン）:
  ```http
  HTTP/1.1 401 Unauthorized
  WWW-Authenticate: Bearer realm="MCP Server", error="invalid_token", error_description="Token validation failed"
  ```

- **403 Forbidden**（スコープ不足）:
  ```http
  HTTP/1.1 403 Forbidden
  WWW-Authenticate: Bearer realm="MCP Server", error="insufficient_scope", scope="mcp:read", error_description="Token does not have sufficient scope"
  ```

## インターフェース設計

### 更新ファイル: `routes/mcp.js`
既存の`/api/mcp/session`エンドポイントハンドラーを拡張します。

```javascript
/**
 * MCP Session endpoint with authentication
 * GET /api/mcp/session
 */
router.get('/api/mcp/session', 
    MCPAuth.requireAuth(['mcp:read']),
    async (req, res) => {
        // req.auth contains validated JWT claims
        // Build comprehensive session response
        // Include user information from JWT
        // Add server-side session metadata
        // List available capabilities based on scopes
        // Return standardized session object
    }
);
```

### 新規ファイル: `lib/session.js`
セッション情報の構築と管理を行うモジュール。

```javascript
/**
 * Session management for MCP server
 */
class MCPSession {
    /**
     * Build session response from authentication context
     * @param {Object} authContext - Authentication context from JWT
     * @param {Object} request - Express request object
     * @returns {Object} Session response object
     */
    static buildSessionResponse(authContext, request) {
        const user = this.formatUserInfo(authContext);
        const sessionInfo = this.extractSessionMetadata(request);
        const scopes = this.parseScopes(authContext); // 'scope'（スペース区切り）または'scp'（配列）をサポート
        const capabilities = this.getCapabilitiesFromScopes(scopes);
        
        return {
            user_id: user.user_id,
            username: user.username,
            display_name: user.display_name,    // スコープによる条件付き
            email: user.email,                   // スコープによる条件付き
            scopes,
            expires_at: this.toRFC3339(authContext.expiresAt),
            issued_at: this.toRFC3339(authContext.issuedAt),
            issuer: authContext.issuer,
            audience: authContext.audience,
            token_type: 'access_token',
            token_id: authContext.tokenId,       // デバッグ用途のみで含める
            session_id: sessionInfo.session_id,
            session_info: sessionInfo,
            capabilities
        };
    }
    
    /**
     * Get user capabilities based on scopes
     * @param {Array<string>} scopes - User's OAuth scopes
     * @returns {Object} Available capabilities
     */
    static getCapabilitiesFromScopes(scopes) {
        const merged = { tools: new Set(), prompts: new Set(), resources: new Set() };
        
        for (const scope of scopes) {
            const capabilities = SCOPE_CAPABILITIES_MAP[scope];
            if (!capabilities) continue;
            
            capabilities.tools?.forEach(t => merged.tools.add(t));
            capabilities.prompts?.forEach(p => merged.prompts.add(p));
            capabilities.resources?.forEach(r => merged.resources.add(r));
        }
        
        return {
            tools: [...merged.tools].sort(),
            prompts: [...merged.prompts].sort(),
            resources: [...merged.resources].sort()
        };
    }
    
    /**
     * Extract session metadata from request
     * @param {Object} request - Express request object
     * @returns {Object} Session metadata
     */
    static extractSessionMetadata(request) {
        // Express: app.set('trust proxy', true)が設定されていることを前提
        const userAgent = request.get('user-agent') || 'Unknown';
        const ipAddress = request.ip; // Expressがtrust proxy設定時に正規化
        
        return {
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            ip_address: ipAddress,
            user_agent: userAgent,
            session_id: `sess_${Math.random().toString(36).slice(2, 10)}`
        };
    }
    
    /**
     * Format user information for response
     * @param {Object} authContext - Authentication context
     * @returns {Object} Formatted user information
     */
    static formatUserInfo(authContext) {
        return {
            user_id: String(authContext.userId || authContext.sub),
            username: authContext.username || authContext.preferred_username,
            display_name: authContext.scopes?.includes('profile') ? authContext.name : undefined,
            email: authContext.scopes?.includes('email') ? authContext.email : undefined
        };
    }
    
    /**
     * Convert Date object to RFC3339 string
     * @param {Date} date - Date object
     * @returns {string|undefined} RFC3339 formatted string
     */
    static toRFC3339(date) {
        if (!date || !(date instanceof Date)) return undefined;
        return date.toISOString();
    }
    
    /**
     * Parse scopes from various JWT formats
     * @param {Object} authContext - Authentication context
     * @returns {Array<string>} Array of scopes
     */
    static parseScopes(authContext) {
        if (Array.isArray(authContext.scopes)) return authContext.scopes;
        if (Array.isArray(authContext.scp)) return authContext.scp;
        if (typeof authContext.scope === 'string') {
            return authContext.scope.trim().split(/\s+/);
        }
        return [];
    }
}
```

## レスポンス構造詳細

### 必須フィールド
- `user_id`: ユーザーの一意識別子（JWTのsub）
- `scopes`: 利用可能なOAuthスコープ配列
- `expires_at`: トークンの有効期限
- `issuer`: トークン発行者

### オプションフィールド  
- `username`: ユーザー名（preferred_usernameまたはusername）
- `display_name`: 表示名（nameクレーム）
- `email`: メールアドレス（emailクレーム）
- `issued_at`: トークン発行時刻
- `audience`: 対象オーディエンス
- `token_id`: トークン識別子（jti）

### 拡張フィールド
- `session_info`: セッションメタデータ
- `capabilities`: 利用可能な機能一覧

## スコープと機能のマッピング

### スコープ定義
- `mcp:read`: 読み取り操作の許可
- `mcp:write`: 書き込み操作の許可  
- `mcp:admin`: 管理操作の許可

### 機能マッピング
```javascript
const SCOPE_CAPABILITIES_MAP = {
    'mcp:read': {
        tools: ['search', 'read'],
        prompts: ['query', 'explain'],
        resources: ['files', 'metadata']
    },
    'mcp:write': {
        tools: ['write', 'update', 'delete'],
        prompts: ['generate', 'modify'],
        resources: ['files', 'database']
    },
    'mcp:admin': {
        tools: ['admin', 'configure'],
        prompts: ['admin_query'],
        resources: ['system', 'users']
    }
};
```

## セキュリティ考慮事項

### レスポンス情報の制限
- PII（個人識別情報）の適切な取り扱い
- 必要最小限の情報のみ返却
- 内部システム情報の隠蔽

### キャッシュ制御
- `Cache-Control: no-store`による機密情報の非キャッシュ化
- `Pragma: no-cache`による後方互換性確保

### IPアドレス処理
- X-Forwarded-Forヘッダーの適切な処理
- プロキシ経由のアクセス考慮
- IPアドレスのプライバシー保護

## パフォーマンス最適化

### レスポンス生成の効率化
- 不要な処理の削減
- 条件付きフィールドの遅延評価
- メモリ効率的なデータ構造

### 並行処理対応
- 非同期処理の活用
- データベースアクセスの最適化
- キャッシュ戦略の適用

## テスト要件

### 単体テスト
- 各種JWTクレームパターンでのレスポンス生成
- スコープに基づく機能マッピング検証
- エッジケースの処理確認

### 統合テスト
- 実際のJWTトークンでのエンドツーエンドテスト
- 各種クライアントからのアクセステスト
- エラーケースの適切な処理確認

## 参考資料
- [OAuth 2.0 Token Introspection](https://tools.ietf.org/html/rfc7662)
- [JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens](https://tools.ietf.org/html/rfc9068)
- [MCP Protocol Specification](https://github.com/modelcontextprotocol/specification)

## チェックボックス
- [ ] `lib/session.js`ファイルの作成（インターフェースのみ）