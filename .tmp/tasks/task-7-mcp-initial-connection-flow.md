# Task 7: MCP初回接続フロー

## 概要

MCP（Model Context Protocol）クライアントの初回接続時における認証フローを実装します。未認証クライアントに対して適切な401応答とOAuth2 Device Authorization Grantフローの開始を促し、認証完了後の自動接続を可能にするシステムを構築します。

### 対象プロトコル
- **MCP (Model Context Protocol)** - JSON-RPCベースの通信プロトコル
- **OAuth2 Device Authorization Grant** (RFC 8628) - デバイス認証フロー
- **SSE (Server-Sent Events)** - リアルタイム通信

### 認証フロー概要
1. **未認証接続**: クライアントが認証なしでMCPエンドポイントにアクセス
2. **401応答**: RFC 6750準拠の認証要求と認証サーバー情報を返却
3. **デバイス認証**: クライアントがDevice Authorization Grantフローを開始
4. **認証完了**: 有効なアクセストークン取得後に自動でMCP接続を再開

## 実装対象

### 1. 未認証時の401応答強化 (`routes/mcp.js`)

現在のMCPエンドポイントにおける未認証時の応答を改善し、OAuth2認証フローの開始に必要な情報を提供します。

#### 現在の実装
```javascript
// GET /api/mcp - SSE接続エンドポイント
router.get('/api/mcp', OAuthAuthenticator.authenticate, (req, res) => {
    // 認証必須のSSE接続
});

// POST /api/mcp - JSON-RPC通信エンドポイント
router.post('/api/mcp', OAuthAuthenticator.authenticate, (req, res) => {
    // 認証必須のJSON-RPC処理
});
```

#### 改善後の実装
```javascript
/**
 * Enhanced 401 response for MCP initial connection
 * Provides OAuth2 Device Authorization Grant flow information
 */
const sendMCPAuthenticationRequired = (res) => {
    const authServerUrl = `${req.protocol}://${req.get('Host')}`;
    const deviceAuthUrl = `${authServerUrl}/api/oauth/device_authorization`;
    const tokenUrl = `${authServerUrl}/api/oauth/token`;
    
    res.status(401).set({
        'WWW-Authenticate': `Bearer realm="MCP API", error="invalid_token", error_description="Authentication required"`,
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
    }).json({
        error: 'authentication_required',
        error_description: 'MCP access requires OAuth2 authentication',
        oauth2: {
            device_authorization_endpoint: deviceAuthUrl,
            token_endpoint: tokenUrl,
            grant_types_supported: ['urn:ietf:params:oauth:grant-type:device_code'],
            scopes_supported: ['mcp:read', 'mcp:write'],
            client_id: 'mcp-client'
        },
        instructions: {
            step1: 'Make POST request to device_authorization_endpoint with client_id',
            step2: 'Direct user to verification_uri with user_code',
            step3: 'Poll token_endpoint until authorization is complete',
            step4: 'Retry MCP connection with access_token'
        }
    });
};
```

### 2. デバイス認証フロー情報の提供

MCPクライアント（Claude Desktop等）が認証フローを開始するために必要な情報を401応答に含めます。

#### 応答内容
```javascript
{
    "error": "authentication_required",
    "error_description": "MCP access requires OAuth2 authentication",
    "oauth2": {
        "device_authorization_endpoint": "https://example.com/api/oauth/device_authorization",
        "token_endpoint": "https://example.com/api/oauth/token", 
        "grant_types_supported": ["urn:ietf:params:oauth:grant-type:device_code"],
        "scopes_supported": ["mcp:read", "mcp:write"],
        "client_id": "mcp-client"
    },
    "instructions": {
        "step1": "Make POST request to device_authorization_endpoint with client_id",
        "step2": "Direct user to verification_uri with user_code", 
        "step3": "Poll token_endpoint until authorization is complete",
        "step4": "Retry MCP connection with access_token"
    }
}
```

### 3. 認証状態の動的チェック

SSE接続において、認証状態をリアルタイムで監視し、トークン期限切れ時の適切な処理を実装します。

#### トークン監視機能
```javascript
/**
 * Monitor token expiration during SSE connection
 * Send authentication events when token expires
 */
const monitorTokenExpiration = (req, res, authInfo) => {
    const expiryTime = new Date(authInfo.expiresAt).getTime();
    const now = Date.now();
    const timeToExpiry = expiryTime - now;
    
    if (timeToExpiry > 0 && timeToExpiry < 300000) { // 5分以内に期限切れ
        setTimeout(() => {
            const expiryNotification = {
                jsonrpc: '2.0',
                method: 'notifications/token_expiring',
                params: {
                    expires_in: Math.max(0, Math.floor((expiryTime - Date.now()) / 1000)),
                    refresh_required: true
                }
            };
            res.write(`event: token_expiring\n`);
            res.write(`data: ${JSON.stringify(expiryNotification)}\n\n`);
        }, timeToExpiry - 300000); // 5分前に通知
    }
};
```

### 4. 自動再接続ガイダンス

認証完了後のMCP接続再開をスムーズに行うためのガイダンス機能を実装します。

#### 接続ガイダンス応答
```javascript
/**
 * Provide connection guidance after successful authentication
 * Sent via SSE when new token is available
 */
const sendConnectionGuidance = (res, tokenInfo) => {
    const guidanceNotification = {
        jsonrpc: '2.0',
        method: 'notifications/connection_ready',
        params: {
            access_token: tokenInfo.access_token,
            token_type: 'Bearer',
            expires_in: tokenInfo.expires_in,
            connection_endpoints: {
                sse: '/api/mcp',
                jsonrpc: '/api/mcp'
            },
            usage_example: 'Authorization: Bearer ' + tokenInfo.access_token
        }
    };
    res.write(`event: connection_ready\n`);
    res.write(`data: ${JSON.stringify(guidanceNotification)}\n\n`);
};
```

## 実装詳細

### エンドポイント更新内容

#### 1. `GET /api/mcp` (SSE接続)
- **未認証時**: 強化された401応答でOAuth2フロー情報を提供
- **認証済み**: 既存のSSE接続ロジックを維持
- **トークン監視**: 期限切れ予告通知を送信

#### 2. `POST /api/mcp` (JSON-RPC)
- **未認証時**: 401応答にOAuth2フロー情報を含める
- **認証済み**: 既存のJSON-RPC処理を維持
- **エラーハンドリング**: 認証エラーの詳細情報を提供

#### 3. OAuth2フロー統合
- デバイス認証エンドポイント情報の動的生成
- クライアント設定の自動提供
- 認証完了後のガイダンス

### セキュリティ考慮事項

#### 1. 情報開示の制御
```javascript
// 最小限の情報のみを開示
const publicOAuthInfo = {
    device_authorization_endpoint: deviceAuthUrl,
    token_endpoint: tokenUrl,
    grant_types_supported: ['urn:ietf:params:oauth:grant-type:device_code'],
    // 内部実装詳細は非開示
};
```

#### 2. レート制限との連携
```javascript
// 未認証時の401応答にもレート制限を適用
const rateLimitUnauthenticated = (req, res, next) => {
    // 未認証クライアントからの過度な401要求を制限
};
```

#### 3. ログ監査
```javascript
// 認証フロー開始の監査ログ
winston.info('[mcp-server] OAuth2 authentication flow initiated', {
    clientIP: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
});
```

## 実装ファイル

### 更新対象
- `plugins/nodebb-plugin-mcp-server/routes/mcp.js` - 認証フロー統合、401応答強化

### 依存ファイル（変更なし）
- `plugins/nodebb-plugin-mcp-server/lib/unified-auth.js` - 既存認証ミドルウェア
- `plugins/nodebb-plugin-mcp-server/routes/oauth.js` - OAuth2エンドポイント
- `plugins/nodebb-plugin-mcp-server/lib/oauth-device.js` - デバイス認証ロジック

## テスト観点

### 正常系
1. **未認証初回接続**: 401応答でOAuth2情報が適切に返却される
2. **デバイス認証フロー**: 提供された情報でOAuth2フローが正常に開始できる
3. **認証後再接続**: アクセストークンを使用してMCP接続が正常に確立される
4. **トークン監視**: 期限切れ予告通知が適切なタイミングで送信される

### 異常系  
1. **不正な認証フロー**: 無効なクライアント情報での認証試行を適切に拒否
2. **期限切れトークン**: 期限切れトークンでの接続試行に対する適切なエラー応答
3. **ネットワーク切断**: 認証フロー中のネットワーク切断時の適切な処理

### セキュリティ
1. **情報開示制限**: 内部実装詳細が外部に漏洩しないことを確認
2. **レート制限**: 未認証時の401応答にもレート制限が適用されることを確認
3. **監査ログ**: 認証フロー開始・完了が適切にログされることを確認

### Claude Desktop統合
1. **mcp-remote互換性**: `mcp-remote`経由でのOAuth2フロー動作確認
2. **エラーハンドリング**: Claude Desktop側でのエラー表示と再試行動作
3. **ユーザビリティ**: 認証フロー全体のユーザー体験の検証