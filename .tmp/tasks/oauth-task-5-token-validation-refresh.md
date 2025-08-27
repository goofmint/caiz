# OAuth Task 5: トークン検証とリフレッシュ

## 概要

OAuth2 Device Authorization Grantにおけるトークン検証とリフレッシュトークンを使用したアクセストークン更新機能を実装します。
リフレッシュトークンローテーションによるセキュリティ強化とトークンライフサイクル管理を提供します。

## 実装対象

### 1. リフレッシュトークン処理（POST /oauth/token）

既存の`/oauth/token`エンドポイントに`refresh_token` grant_typeのサポートを追加します。

#### リクエスト仕様
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=8xLOxBtZp8
&client_id=mcp-client
&scope=mcp:read mcp:search
```

#### パラメータ
- `grant_type`: 必須、固定値 `refresh_token`
- `refresh_token`: 必須、有効なリフレッシュトークン
- `client_id`: 必須、元のトークンリクエストと同じclient_id
- `scope`: 任意、元のスコープのサブセット（省略時は元のスコープを維持）

#### 成功レスポンス
```json
{
  "access_token": "new_access_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new_refresh_token",
  "scope": "mcp:read mcp:search"
}
```

### 2. トークン検証エンドポイント（POST /oauth/introspect）

トークンの有効性を検証するイントロスペクションエンドポイントを実装します。

#### リクエスト仕様
```http
POST /oauth/introspect
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)   # 機密クライアント
# または mTLS / DPoP による公開クライアント認証

token={token_to_introspect}
&token_type_hint=access_token
```

**認証要件**
- 機密クライアント: `client_secret_basic` または `client_secret_post` 必須
- 公開クライアント: mTLS または DPoP による送信者拘束認証を推奨
- 認証失敗または対象トークンへの権限なし: HTTP 401 + WWW-Authenticate ヘッダー

#### レスポンス仕様

**アクティブなトークン**
```json
{
  "active": true,
  "scope": "mcp:read mcp:search",
  "client_id": "mcp-client",
  "sub": "123",
  "aud": ["mcp-client"],
  "token_type": "Bearer",
  "exp": 1419356238,
  "iat": 1419350238
}
```

**非アクティブなトークン**
```json
{
  "active": false
}
```

**注意事項**
- PII漏洩防止のため`username`は含まない
- 非アクティブ時は`{"active": false}`のみ返却
- `aud`は配列形式でマルチオーディエンス対応

### 3. Token Storage改善（lib/token-storage.js）

トークンの永続化とライフサイクル管理を担当するモジュールです。

#### インターフェース

```javascript
class TokenStorage {
    /**
     * Store access token with metadata
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {Object} tokenData - Token metadata
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<void>}
     */
    static async storeAccessToken(tokenHash, tokenData, ttl);

    /**
     * Store refresh token with rotation tracking
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {Object} tokenData - Token metadata
     * @param {string} familyId - Rotation family ID
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<void>}
     */
    static async storeRefreshToken(tokenHash, tokenData, familyId, ttl);

    /**
     * Get token data by hash
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {string} tokenType - 'access' or 'refresh'
     * @returns {Promise<Object|null>} Token data or null if not found
     */
    static async getToken(tokenHash, tokenType);

    /**
     * Rotate refresh token
     * @param {string} oldTokenHash - Hash of current refresh token
     * @param {string} newTokenHash - Hash of new refresh token
     * @param {Object} newTokenData - New token metadata
     * @returns {Promise<void>}
     */
    static async rotateRefreshToken(oldTokenHash, newTokenHash, newTokenData);

    /**
     * Revoke all tokens in rotation family (for security breach)
     * @param {string} familyId - Rotation family ID
     * @returns {Promise<number>} Number of revoked tokens
     */
    static async revokeTokenFamily(familyId);

    /**
     * Clean up expired tokens
     * @returns {Promise<number>} Number of removed tokens
     */
    static async cleanupExpiredTokens();

    /**
     * Check if token is revoked
     * @param {string} tokenHash - SHA-256 hash of the token
     * @returns {Promise<boolean>} True if revoked
     */
    static async isTokenRevoked(tokenHash);

    /**
     * Track token usage for audit
     * @param {string} tokenHash - SHA-256 hash of the token
     * @param {Object} usageData - Usage metadata (ip, userAgent, timestamp)
     * @returns {Promise<void>}
     */
    static async trackTokenUsage(tokenHash, usageData);
}
```

### 4. リフレッシュトークンローテーション

セキュリティ強化のためのリフレッシュトークンローテーション機能です。

#### ローテーションフロー
1. リフレッシュトークン使用時に新しいトークンペアを発行
2. 古いリフレッシュトークンを無効化（1回限りの使用）
3. 同一familyIdで管理してリークを検知
4. 再利用検知時は全family内トークンを無効化

#### データ構造
```javascript
// Refresh Token Rotation Tracking
const rotationData = {
    token_hash: 'sha256_hash',
    family_id: 'uuid_v4',
    generation: 1, // Increments with each rotation
    parent_token_hash: 'previous_token_hash',
    created_at: Date.now(),
    used_at: null,
    revoked_at: null,
    revocation_reason: null // 'rotated', 'expired', 'security_breach'
};
```

### 5. トークン有効期限管理

#### 有効期限ポリシー
- アクセストークン: 1時間（3600秒）
- リフレッシュトークン: 7日（604800秒）
- デバイス認証コード: 10分（600秒）
- ポーリング間隔: 5秒（デフォルト）

#### 自動クリーンアップ
```javascript
// Scheduled cleanup task (runs every hour)
const cleanupTask = {
    interval: 3600000, // 1 hour in milliseconds
    targets: [
        'oauth:access_token:*',
        'oauth:refresh_token:*',
        'oauth:device:*'
    ],
    action: 'removeExpired'
};
```

## セキュリティ考慮事項

### トークン保護
- トークンハッシュのみ保存（平文は保存しない）
- 暗号学的に安全な乱数生成（crypto.randomBytes）
- 定期的な有効期限チェックと自動削除

### リフレッシュトークン再利用検知
- 使用済みトークンの再利用を検知
- 検知時は同一ファミリーの全トークンを無効化
- 監査ログ記録でセキュリティインシデント追跡

### Rate Limiting
- トークンリフレッシュ回数制限
- 異常なリフレッシュパターンの検知
- クライアント別の使用統計

## 実装ファイル

### 新規作成
- `lib/token-storage.js` - Token永続化とライフサイクル管理

### 更新対象
- `lib/oauth-token.js` - refreshDeviceAccessToken改善
- `routes/oauth.js` - refresh_token grant_type追加、/oauth/introspect追加

## テスト観点

### 正常系
1. 有効なリフレッシュトークンでの更新
2. トークンローテーション動作
3. スコープダウングレード
4. イントロスペクション応答

### 異常系
1. 無効なリフレッシュトークン
2. 期限切れリフレッシュトークン
3. 使用済みトークンの再利用検知
4. client_id不一致
5. スコープアップグレード拒否

### セキュリティ
1. トークンファミリー無効化
2. 再利用攻撃防御
3. 監査ログ記録