# タスク2: Device Authorization Grant実装

## 概要
OAuth2 Device Authorization Grant（RFC 8628）の実装。入力機能が限定されたデバイス（Claude Desktop等）からの認証フローをサポートする。

## 実装対象

### 1. デバイス認証エンドポイント

#### POST /oauth/device_authorization
デバイスコードとユーザーコードを発行する。

```javascript
// routes/oauth.js
'use strict';

const winston = require.main.require('winston');
const DeviceAuthManager = require('../lib/oauth-device');

/**
 * Device Authorization Request
 * RFC 8628 Section 3.1
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deviceAuthorization(req, res) {
    // Implementation:
    // 1. Validate client_id and scope
    // 2. Generate device_code and user_code
    // 3. Store authorization request with expiration
    // 4. Return device authorization response
}

module.exports = function(router) {
    router.post('/oauth/device_authorization', deviceAuthorization);
};
```

**リクエスト例:**
```http
POST /oauth/device_authorization HTTP/1.1
Content-Type: application/x-www-form-urlencoded

client_id=caiz-mcp-server&scope=mcp:read+mcp:search
```

**レスポンス例:**
```json
{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://caiz.test/oauth/device",
  "verification_uri_complete": "https://caiz.test/oauth/device?user_code=WDJB-MJHT",
  "expires_in": 600,
  "interval": 5
}
```

### 2. デバイスコード管理

#### lib/oauth-device.js
デバイスコードとユーザーコードの生成・管理を行う。

```javascript
'use strict';

const crypto = require('crypto');
const db = require.main.require('./src/database');

class DeviceAuthManager {
    /**
     * Generate device code
     * @returns {string} device_code - URL-safe random string
     */
    static generateDeviceCode() {
        // 32 bytes -> base64url (no padding) => 43 characters
        const bytes = crypto.randomBytes(32);
        return bytes
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * Generate user code  
     * @returns {string} user_code - Human-readable code
     */
    static generateUserCode() {
        // Exclude ambiguous chars: I, L, O, 0, 1
        const charset = 'BCDFGHJKMNPQRSTVWXYZ23456789';
        const pick = n =>
            crypto
                .randomBytes(n)
                .map(b => charset.charCodeAt(b % charset.length));

        const a = Buffer.from(pick(4)).toString('utf8');
        const b = Buffer.from(pick(4)).toString('utf8');
        return `${a}-${b}`;
    }

    /**
     * Store device authorization request
     * @param {Object} authRequest - Authorization request data
     */
    static async storeAuthRequest(authRequest) {
        // TTL in seconds as provided by authRequest.expires_in
        const ttl = authRequest.expires_in;

        // Use atomic SET NX with EX to avoid collisions; fall back to retry loop if unsupported
        // Primary key:   oauth:device:{device_code}  -> JSON.stringify(authRequest)
        // Reverse key:   oauth:user_code:{user_code} -> device_code
        // Both keys must share the same TTL for consistency
        // (Implementation detail depends on your Redis client's support for multi/exec or Lua scripting)
    }

    /**
     * Retrieve authorization request by device code
     * @param {string} deviceCode
     * @returns {Object|null} Authorization request or null
     */
    static async getAuthRequestByDeviceCode(deviceCode) {
        // Retrieve from Redis
        // Check expiration
        // Return parsed data or null
    }

    /**
     * Retrieve authorization request by user code
     * @param {string} userCode  
     * @returns {Object|null} Authorization request or null
     */
    static async getAuthRequestByUserCode(userCode) {
        // Find device_code by user_code index
        // Retrieve full auth request
    }

    /**
     * Update authorization status
     * @param {string} deviceCode
     * @param {string} status - 'pending', 'approved', 'denied'
     * @param {number} userId - User ID if approved
     */
    static async updateAuthStatus(deviceCode, status, userId) {
        // Update authorization request status
        // Add user_id if approved
        // Maintain expiration
    }
}

module.exports = DeviceAuthManager;
```

### 3. ユーザーコード形式

#### ユーザーコードの特徴
- 8文字（XXXX-XXXX形式）
- 曖昧な文字を除外（0/O、1/I/L等）
- 使用可能文字: `BCDFGHJKMNPQRSTVWXYZ23456789`
- 大文字小文字を区別しない
- 有効期限: 10分

#### デバイスコードの特徴
- 43文字のBase64URL文字列
- 暗号学的に安全な乱数を使用
- URLセーフ文字のみ使用
- 有効期限: 10分

### 4. データストレージ

#### Redis キー構造
```text
oauth:device:{device_code}
  - client_id: string
  - user_code: string
  - scope: string
  - status: 'pending' | 'approved' | 'denied'
  - user_id: number (when approved)
  - created_at: timestamp
  - expires_at: timestamp

oauth:user_code:{user_code} -> device_code
  - Reverse lookup for user code validation
```

### 5. エラーハンドリング

#### RFC 8628準拠のエラーレスポンス

**デバイス認可エンドポイント（/oauth/device_authorization）:**
```javascript
// 無効なクライアント
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}

// 無効なスコープ
{
  "error": "invalid_scope", 
  "error_description": "The requested scope is invalid or unknown"
}
```

**トークンエンドポイント（/oauth/token でのポーリング）:**
```javascript
// 承認待ち
{
  "error": "authorization_pending",
  "error_description": "The device authorization request is still pending"
}

// ユーザーが拒否
{
  "error": "access_denied",
  "error_description": "The user denied the authorization request"
}

// デバイスコード期限切れ
{
  "error": "expired_token",
  "error_description": "The device code has expired"
}

// ポーリング間隔違反（サーバー側指示）
{
  "error": "slow_down",
  "error_description": "Too many requests, please slow down the polling interval"
}
```

## 設定項目

```javascript
const deviceAuthConfig = {
    userCodeLength: 8,
    userCodeCharset: 'BCDFGHJKMNPQRSTVWXYZ23456789',
    deviceCodeLength: 43,
    codeExpiry: 600, // 10分
    pollingInterval: 5, // 5秒
    maxPollingAttempts: 120 // 最大10分間のポーリング
};
```

## セキュリティ考慮事項

1. **ユーザーコードのブルートフォース対策**
   - レート制限の実装
   - 試行回数制限
   - 有効期限の設定

2. **デバイスコードのエントロピー**
   - 暗号学的に安全な乱数生成
   - 十分な長さ（256ビット相当）

3. **有効期限管理**
   - Redisの自動期限切れ機能を活用
   - 期限切れコードの自動削除

## テスト要件

1. デバイスコード生成のユニーク性
2. ユーザーコードの可読性と一意性
3. 有効期限の動作確認
4. エラーレスポンスの形式確認
5. レート制限の動作確認