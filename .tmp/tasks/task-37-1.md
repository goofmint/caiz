# Task 37.1: Authorization Server Discovery実装

## 目的
OAuth 2.0 Authorization Server Metadata (RFC 8414)準拠のDiscoveryエンドポイント提供

## エンドポイント仕様
- **パス**: `GET /.well-known/oauth-authorization-server`
- **Content-Type**: `application/json`
- **キャッシュ**: `public, max-age=3600`

## 必要なレスポンス
```json
{
  "issuer": "https://caiz.test",
  "authorization_endpoint": "https://caiz.test/oauth/authorize",
  "token_endpoint": "https://caiz.test/oauth/token", 
  "jwks_uri": "https://caiz.test/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["mcp:read", "mcp:write", "mcp:admin"],
  "token_endpoint_auth_methods_supported": ["none", "client_secret_post"],
  "authorization_response_iss_parameter_supported": true
}
```

## 実装ファイル

### 1. `lib/oauth-discovery.js` (新規作成)
```javascript
'use strict';

const nconf = require.main.require('nconf');

class OAuthDiscovery {
    static getMetadata() {
        const baseUrl = nconf.get('url') || 'https://caiz.test';
        
        return {
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/oauth/authorize`,
            token_endpoint: `${baseUrl}/oauth/token`,
            jwks_uri: `${baseUrl}/.well-known/jwks.json`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code", "refresh_token"],
            code_challenge_methods_supported: ["S256"],
            scopes_supported: ["mcp:read", "mcp:write", "mcp:admin"],
            token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
            authorization_response_iss_parameter_supported: true
        };
    }
}

module.exports = OAuthDiscovery;
```

### 2. `library.js`修正
`setupWellKnownRoutes()`関数に以下を追加：

```javascript
// OAuth Authorization Server Discovery endpoint
app.get('/.well-known/oauth-authorization-server', (req, res) => {
    try {
        winston.verbose('[mcp-server] OAuth Discovery metadata requested');
        
        const OAuthDiscovery = require('./lib/oauth-discovery');
        const metadata = OAuthDiscovery.getMetadata();
        
        // Set appropriate headers
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        
        res.json(metadata);
        winston.verbose('[mcp-server] OAuth Discovery metadata sent successfully');
    } catch (err) {
        winston.error('[mcp-server] OAuth Discovery error:', err);
        res.status(500).json({
            error: 'server_error',
            error_description: 'Internal server error while generating OAuth metadata'
        });
    }
});
```

## 検証方法
```bash
curl -s https://caiz.test/.well-known/oauth-authorization-server | jq .
```

期待される結果：
- ステータス: 200 OK
- Content-Type: application/json
- 全ての必須フィールドが含まれている
- エンドポイントURLが正しい

## 完了条件
- [ ] `lib/oauth-discovery.js`作成
- [ ] `library.js`にルート追加
- [ ] curlテストで200 + JSON応答確認
- [ ] 全メタデータフィールド正常表示確認