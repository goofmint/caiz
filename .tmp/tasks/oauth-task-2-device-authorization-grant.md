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
        // Generate cryptographically secure random device code
        // Format: Base64URL encoded random bytes (43 characters)
    }

    /**
     * Generate user code  
     * @returns {string} user_code - Human-readable code
     */
    static generateUserCode() {
        // Generate human-friendly code
        // Format: XXXX-XXXX (8 characters, excluding ambiguous characters)
    }

    /**
     * Store device authorization request
     * @param {Object} authRequest - Authorization request data
     */
    static async storeAuthRequest(authRequest) {
        // Store in Redis with expiration
        // Key: oauth:device:{device_code}
        // Data: client_id, user_code, scope, status, user_id (when approved)
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
```
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

// レート制限
{
  "error": "slow_down",
  "error_description": "Too many requests, please slow down"
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