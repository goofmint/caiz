# Task 37.3: Token Endpoint実装

## 目的
Authorization codeをAccess tokenに交換するトークンエンドポイント

## エンドポイント仕様
- **パス**: `POST /oauth/token`
- **Content-Type**: `application/x-www-form-urlencoded`
- **認証**: client認証（任意）

## 必須パラメータ
```javascript
const requiredParams = {
    grant_type: 'authorization_code',  // 固定値
    code: 'Task 37.2で生成したcode',   // Authorization code
    redirect_uri: '37.2と同じURI',     // 一致必須
    client_id: '37.2と同じID',         // 一致必須
    code_verifier: 'PKCE verifier',    // Base64URL文字列
    resource: 'https://caiz.test'      // Resource Indicators
};
```

## 処理フロー
1. **パラメータ検証**
   - `grant_type=authorization_code`確認
   - 全必須パラメータ存在確認

2. **Authorization Code検証**
   - codeが有効か（存在・未使用・有効期限内）
   - `client_id`, `redirect_uri`一致確認
   - `resource`パラメータ一致確認

3. **PKCE検証**
   - `S256(code_verifier) === code_challenge`確認

4. **Access Token生成**
   - JWT形式のAccess token作成（1時間有効）
   - Refresh token作成（24時間有効、任意）
   - Authorization codeを無効化（使い捨て）

5. **レスポンス返却**

## 実装ファイル

### 1. `lib/oauth-token.js` (新規作成)
```javascript
'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');
const JWKSManager = require('./jwks');

class OAuthToken {
    constructor() {
        // Authorization codes storage (production: Redis/DB)
        this.authCodes = new Map();
        // Refresh tokens storage
        this.refreshTokens = new Map();
    }

    /**
     * Validate token request parameters
     */
    validateTokenParams(params) {
        const required = ['grant_type', 'code', 'redirect_uri', 'client_id', 'code_verifier', 'resource'];
        
        for (const param of required) {
            if (!params[param]) {
                throw new Error(`Missing required parameter: ${param}`);
            }
        }
        
        if (params.grant_type !== 'authorization_code') {
            throw new Error('Unsupported grant_type');
        }
        
        return true;
    }

    /**
     * Validate authorization code and PKCE
     */
    validateAuthorizationCode(code, codeVerifier, clientId, redirectUri, resource) {
        const authCode = this.authCodes.get(code);
        
        if (!authCode) {
            throw new Error('Invalid authorization code');
        }
        
        if (authCode.used) {
            throw new Error('Authorization code already used');
        }
        
        if (Date.now() > authCode.expiresAt) {
            this.authCodes.delete(code);
            throw new Error('Authorization code expired');
        }
        
        if (authCode.clientId !== clientId) {
            throw new Error('Client ID mismatch');
        }
        
        if (authCode.redirectUri !== redirectUri) {
            throw new Error('Redirect URI mismatch');
        }
        
        if (authCode.resource !== resource) {
            throw new Error('Resource parameter mismatch');
        }
        
        // PKCE verification
        const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
        if (hash !== authCode.codeChallenge) {
            throw new Error('PKCE verification failed');
        }
        
        return authCode;
    }

    /**
     * Generate access token (JWT)
     */
    generateAccessToken(authCode) {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = 3600; // 1 hour
        
        const payload = {
            iss: 'https://caiz.test',
            aud: 'https://caiz.test',
            sub: String(authCode.userId),
            iat: now,
            exp: now + expiresIn,
            scope: authCode.scopes.join(' '),
            preferred_username: authCode.username,
            name: authCode.displayName,
            email: authCode.email
        };
        
        const accessToken = JWKSManager.signJWT(payload);
        
        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: expiresIn,
            scope: authCode.scopes.join(' ')
        };
    }

    /**
     * Generate refresh token (optional)
     */
    generateRefreshToken(authCode) {
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        this.refreshTokens.set(refreshToken, {
            userId: authCode.userId,
            clientId: authCode.clientId,
            scopes: authCode.scopes,
            expiresAt
        });
        
        return {
            refresh_token: refreshToken,
            refresh_token_expires_in: 86400 // 24 hours
        };
    }

    /**
     * Process token exchange
     */
    exchangeCodeForToken(params) {
        // 1. Validate parameters
        this.validateTokenParams(params);
        
        // 2. Validate authorization code and PKCE
        const authCode = this.validateAuthorizationCode(
            params.code,
            params.code_verifier,
            params.client_id,
            params.redirect_uri,
            params.resource
        );
        
        // 3. Mark code as used
        authCode.used = true;
        
        // 4. Generate tokens
        const accessTokenResponse = this.generateAccessToken(authCode);
        const refreshTokenResponse = this.generateRefreshToken(authCode);
        
        // 5. Clean up expired codes
        this.cleanupExpiredCodes();
        
        return {
            ...accessTokenResponse,
            ...refreshTokenResponse
        };
    }

    /**
     * Cleanup expired authorization codes
     */
    cleanupExpiredCodes() {
        const now = Date.now();
        for (const [code, data] of this.authCodes.entries()) {
            if (now > data.expiresAt) {
                this.authCodes.delete(code);
            }
        }
    }

    /**
     * Store authorization code (called from Task 37.2)
     */
    storeAuthorizationCode(code, data) {
        this.authCodes.set(code, {
            ...data,
            used: false,
            createdAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
        });
    }
}

// Singleton instance
const oauthToken = new OAuthToken();

module.exports = oauthToken;
```

### 2. `routes/oauth.js`に追加
```javascript
/**
 * OAuth Token Endpoint
 * POST /oauth/token
 */
router.post('/oauth/token', async (req, res) => {
    try {
        winston.verbose('[mcp-server] Token exchange requested');
        
        const OAuthToken = require('../lib/oauth-token');
        const tokenResponse = OAuthToken.exchangeCodeForToken(req.body);
        
        // Set security headers
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
        });
        
        res.json(tokenResponse);
        winston.verbose('[mcp-server] Access token issued successfully');
        
    } catch (err) {
        winston.error('[mcp-server] Token exchange error:', err);
        
        // OAuth 2.0 error response format
        res.status(400).json({
            error: 'invalid_grant',
            error_description: err.message
        });
    }
});
```

## レスポンス例
### 成功時 (200 OK)
```json
{
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1jcC1rZXktMTcwMDE2NDgxNi05YzJkM2IifQ...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": "mcp:read mcp:write",
    "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "refresh_token_expires_in": 86400
}
```

### エラー時 (400 Bad Request)
```json
{
    "error": "invalid_grant",
    "error_description": "Authorization code expired"
}
```

## JWT Claims例
```json
{
    "iss": "https://caiz.test",
    "aud": "https://caiz.test",
    "sub": "123",
    "iat": 1700164816,
    "exp": 1700168416,
    "scope": "mcp:read mcp:write",
    "preferred_username": "testuser",
    "name": "Test User",
    "email": "test@example.com"
}
```

## エラー種別
- **invalid_request**: パラメータ不正
- **invalid_grant**: Authorization code不正・期限切れ
- **unauthorized_client**: クライアント認証失敗
- **unsupported_grant_type**: grant_type不正
- **server_error**: サーバー内部エラー

## 検証方法
```bash
# Task 37.2で取得したauthorization codeを使用
curl -X POST https://caiz.test/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=abc123def456" \
  -d "redirect_uri=http://127.0.0.1:43110/callback" \
  -d "client_id=test-client" \
  -d "code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk" \
  -d "resource=https://caiz.test"
```

## 完了条件
- [ ] `oauth-token.js`作成・Authorization code管理実装
- [ ] PKCE検証実装
- [ ] Access token生成（JWT）実装
- [ ] Refresh token生成実装
- [ ] POST `/oauth/token`エンドポイント実装
- [ ] エラーハンドリング実装
- [ ] curlテストで正常なトークン交換確認
- [ ] 生成したJWTが既存auth.jsで正常検証されることを確認