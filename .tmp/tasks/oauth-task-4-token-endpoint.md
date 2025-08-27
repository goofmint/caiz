# OAuth Task 4: Token Endpoint Implementation

## 概要

RFC 8628に準拠したOAuth2 Device Authorization Grant のToken Endpointを実装します。
Device Authorization Grantフローで生成されたdevice_codeをアクセストークン・リフレッシュトークンと交換する機能を提供します。

## 実装対象

### 1. POST /oauth/token エンドポイント

Device Authorization Grantフローのトークン交換処理を実装します。

#### リクエスト仕様
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:device_code
&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEjNkLxIgn68x-cGYYXdIj6CjZbcTSDl6w5V5Xb_r
&client_id=mcp-client
; (confidential clients) Use HTTP Basic client authentication or include client_secret in body if enabled.
```

#### パラメータ検証
- `grant_type`: 必須、固定値 `urn:ietf:params:oauth:grant-type:device_code`
- `device_code`: 必須、`/oauth/device_authorization`で発行されたdevice_code
- `client_id`: 必須、有効なclient_id

#### エラーレスポンス（RFC 8628 Section 3.5）
- HTTP 400, `Content-Type: application/json`, `Cache-Control: no-store`, `Pragma: no-cache`
- `authorization_pending`: ユーザーがまだ承認していない
- `slow_down`: ポーリング間隔が短すぎる（クライアントは現在の間隔に+5秒以上で再試行）
- `expired_token`: device_codeの有効期限切れ
- `access_denied`: ユーザーが認証を拒否
- `invalid_grant`: 無効なdevice_code
- `invalid_request`: パラメータエラー
- `unsupported_grant_type`: サポートされていないgrant_type
- （必要に応じて `unauthorized_client` / `invalid_client` も検討）

#### 成功レスポンス
```json
{
  "access_token": "SlAV32hkKG",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "scope": "mcp:read mcp:search"
}
```

### 2. Token Manager (lib/oauth-token.js)

トークンの生成、検証、管理を行うモジュールです。

#### インターフェース

```javascript
class OAuthTokenManager {
    /**
     * Device codeをアクセストークンに交換
     * @param {Object} params - トークンリクエストパラメータ
     * @param {string} params.grant_type - グラントタイプ
     * @param {string} params.device_code - デバイスコード
     * @param {string} params.client_id - クライアントID
     * @param {Object} ctx - リクエストコンテキスト情報
     * @param {string} ctx.ip - クライアントIPアドレス
     * @param {string} ctx.userAgent - クライアントのユーザーエージェント
     * @param {number} [ctx.now=Date.now()] - リクエスト受信時刻タイムスタンプ
     * @returns {Promise<Object>} Token response
     * @throws {Error} RFC 8628準拠のエラー
     */
    static async exchangeDeviceCodeForToken(
        params /* { grant_type, device_code, client_id } */,
        ctx    /* { ip, userAgent, now=Date.now() } */
    );
    // 要件:
    // - device_code.client_id と params.client_id の一致検証
    // - last_request_at と interval を用いたポーリング制御（違反時は slow_down）
    // - 競合防止: 発行処理は原子的に一度だけ（詳細は Token Storage を参照）
    
    /**
     * アクセストークン生成
     * @param {number} userId - NodeBBユーザーID
     * @param {string} clientId - クライアントID
     * @param {Array<string>} scopes - 承認されたスコープ
     * @returns {Promise<Object>} Token pair
     */
    static async generateTokens(userId, clientId, scopes);
    
    /**
     * リフレッシュトークンでアクセストークン更新
     * @param {string} refreshToken - リフレッシュトークン
     * @returns {Promise<Object>} 新しいToken pair
     */
    static async refreshAccessToken(refreshToken);
    
    /**
     * トークン検証
     * @param {string} accessToken - アクセストークン
     * @returns {Promise<Object>} トークン情報 (userId, scopes, etc.)
     */
    static async validateAccessToken(accessToken);
}
```

### 3. Token Storage (NodeBB database integration)

NodeBBのデータベース抽象化レイヤーを使用してトークン情報を永続化します。

#### データ構造
```javascript
// アクセストークン情報
const accessTokenData = {
    access_token_hash: 'sha256(base64url(access_token))',
    user_id: 123,
    client_id: 'mcp-client',
    scopes: ['mcp:read', 'mcp:search'],
    expires_at: Date.now() + (3600 * 1000), // 1時間後
    created_at: Date.now()
};

// リフレッシュトークン情報
const refreshTokenData = {
    refresh_token_hash: 'sha256(base64url(refresh_token))',
    access_token_hash: 'sha256(base64url(access_token))',
    user_id: 123,
    client_id: 'mcp-client',
    rotation_family_id: 'uuid', // 再発行チェーン
    expires_at: Date.now() + (7 * 24 * 3600 * 1000), // 7日後
    created_at: Date.now()
};
```

#### NodeBBデータベース操作
```javascript
// トークンハッシュ保存（平文トークンは保存しない）
const tokenHash = require('crypto').createHash('sha256')
    .update(Buffer.from(accessToken, 'base64url')).digest('hex');
const refreshTokenHash = require('crypto').createHash('sha256')
    .update(Buffer.from(refreshToken, 'base64url')).digest('hex');

// アクセストークン情報保存
await db.set(`oauth:access_token:${tokenHash}`, JSON.stringify(tokenData));
await db.expire(`oauth:access_token:${tokenHash}`, 3600); // 1時間TTL

// リフレッシュトークン情報保存  
await db.set(`oauth:refresh_token:${refreshTokenHash}`, JSON.stringify(refreshData));
await db.expire(`oauth:refresh_token:${refreshTokenHash}`, 7 * 24 * 3600); // 7日TTL

// device_code状態更新（approved -> token_issued）
// 注意: NodeBBでは真の原子操作が制限されるため、状態確認と更新を慎重に行う
const deviceKey = `oauth:device:${deviceCode}`;
const existingData = JSON.parse(await db.get(deviceKey) || '{}');

if (existingData.status === 'approved') {
    await db.set(deviceKey, JSON.stringify({
        ...existingData,
        status: 'token_issued',
        access_token_hash: tokenHash,
        token_issued_at: Date.now()
    }));
    await db.expire(deviceKey, existingData.expires_in || 600);
} else {
    // 状態が既に変更されている場合は適切なエラーを投げる
    if (existingData.status === 'token_issued') {
        throw new Error('access_denied'); // 既にトークン発行済み
    } else {
        throw new Error('authorization_pending'); // まだ承認されていない
    }
}
```

### 4. Security Considerations

#### トークン生成
- アクセストークン: 32バイトのランダム値をbase64url エンコード
- リフレッシュトークン: 32バイトのランダム値をbase64url エンコード
- 暗号学的に安全な乱数生成器を使用

#### Rate Limiting
- 同一device_codeに対するポーリングレート制限
- `slow_down`エラーで適切なinterval指示

#### Token Lifecycle
- アクセストークン: 1時間有効
- リフレッシュトークン: 7日有効
- device_code処理後は即座に無効化

## 実装ファイル

### 新規作成
- `lib/oauth-token.js` - Token Manager実装
- `lib/token-storage.js` - Token永続化ユーティリティ

### 更新対象
- `routes/oauth.js` - POST /oauth/token エンドポイント追加
- `lib/oauth-device.js` - Device code状態管理メソッド追加

## テスト観点

### 正常系
1. 承認済みdevice_codeでのトークン取得
2. 適切なscope情報の継承
3. トークンの有効期限設定

### 異常系
1. 無効なdevice_code
2. 未承認のdevice_code（authorization_pending）
3. 有効期限切れのdevice_code（expired_token）
4. 拒否されたdevice_code（access_denied）
5. 不正なgrant_type（unsupported_grant_type）
6. 必須パラメータ不足（invalid_request）

### セキュリティ
1. Rate limiting動作
2. Token生成の一意性
3. Token有効期限の遵守