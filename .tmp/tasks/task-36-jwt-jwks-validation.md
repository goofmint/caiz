# タスク36: JWT/JWKS 検証

## 概要
OAuth 2.0 Bearer TokenとしてのJWTトークンの署名検証とクレーム検証を実装します。JWKS（JSON Web Key Set）エンドポイントから公開鍵を取得し、JWT署名の検証、audience（aud）、issuer（iss）、expiration（exp）などの標準クレームの検証を行います。

## 目的
- JWT署名の暗号学的検証によるトークンの真正性確保
- JWKSエンドポイントからの動的な鍵取得によるキーローテーション対応
- 標準JWTクレーム検証による認可制御の強化
- RFC 7517準拠のJWKS処理実装

## JWT検証要件

### 署名検証
- JWTヘッダー`alg`が`RS256`であることを強制（`alg=none`や不一致は即拒否）
- JWKSエンドポイントから公開鍵を動的取得
- 鍵キャッシュによるパフォーマンス最適化
- 鍵更新時の自動再取得機能

### クレーム検証
- `iss` (issuer): トークン発行者の検証
- `aud` (audience): 対象リソースサーバーの検証  
- `exp` (expiration): トークン有効期限の検証
- `nbf` (not before): トークン有効開始時刻の検証
- `iat` (issued at): トークン発行時刻の妥当性検証
- `sub` (subject): ユーザー識別子の取得

### スコープ検証
- `scope`または`scp`クレームからスコープ一覧を抽出
- 要求されたスコープとの照合
- 不十分な場合は403 Forbiddenレスポンス

## インターフェース設計

### 拡張ファイル: `lib/auth.js`
既存のMCPAuthクラスにJWT検証機能を追加します。

```javascript
/**
 * JWT validation and JWKS handling
 */
class MCPAuth {
    // 既存のメソッドは維持
    
    /**
     * Validate JWT token with signature and claims verification
     * @param {string} token - JWT token to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Decoded and verified token payload
     * @throws {Error} Token validation errors
     */
    static async validateJWT(token, options = {}) {
        // JWT tokenの形式チェック (header.payload.signature)
        // ヘッダー検証: alg=RS256, typ=JWT(または未設定), kid 必須, crit 未対応なら拒否
        // JWKSから公開鍵取得
        // 署名検証 (RS256)
        // 標準クレーム検証 (iss, aud, exp, nbf, iat)
        // カスタムクレーム検証
        // デコードされたペイロードを返す
    }
    
    /**
     * Fetch and cache JWKS from the configured endpoint
     * @param {string} jwksUri - JWKS endpoint URI
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} JWKS data with key caching
     */
    static async fetchJWKS(jwksUri, options = {}) {
        // JWKS URI からJWK Set取得
        // RSA公開鍵の抽出とPEM形式変換
        // メモリキャッシュによる性能最適化
        // HTTPキャッシュ尊重: Cache-Control/ETag/Last-Modified を保存し If-None-Match 等で再検証
        // `kid`未ヒット時は即座に再取得(ただしレート制限・バックオフ・同時リクエスト集約)
        // エラー処理とフォールバック（直近の有効キャッシュを一時的に継続使用するstale-while-revalidate）
    }
    
    /**
     * Extract RSA public key from JWK
     * @param {Object} jwk - JSON Web Key object
     * @returns {string} PEM formatted public key
     */
    static extractPublicKeyFromJWK(jwk) {
        // JWKからRSA公開鍵パラメータ (n, e) 抽出
        // PEM形式への変換
        // キー形式の検証: kty=RSA, use=sig(または未指定), algがRS256互換, key_opsにverify含有
    }
    
    /**
     * Verify JWT signature using RSA public key
     * @param {string} token - JWT token
     * @param {string} publicKeyPEM - PEM formatted public key
     * @returns {boolean} Signature verification result
     */
    static verifyJWTSignature(token, publicKeyPEM) {
        // JWT header/payloadとsignature部分の分離
        // RS256署名検証アルゴリズム実行
        // 暗号学的署名の妥当性確認
    }
    
    /**
     * Validate JWT standard claims
     * @param {Object} payload - Decoded JWT payload
     * @param {Object} options - Validation options
     * @returns {boolean} Claims validation result
     */
    static validateJWTClaims(payload, options = {}) {
        // issuer検証: options.expectedIssuer と payload.iss
        // audience検証: options.expectedAudience と payload.aud
        // expiration検証: 現在時刻 vs payload.exp
        // not before検証: 現在時刻 vs payload.nbf
        // issued at検証: payload.iat の妥当性
        // clock skew許容範囲の考慮
    }
}
```

### 設定管理: `config/jwt.js`
JWT検証に必要な設定パラメータを外部化します。

```javascript
/**
 * JWT validation configuration
 */
const jwtConfig = {
    // JWKS設定
    jwks: {
        uri: 'https://caiz.test/.well-known/jwks.json',
        cache: true,
        cacheMaxAge: 3600000, // 1 hour
        timeout: 5000 // 5 seconds
    },
    
    // 検証パラメータ
    validation: {
        issuer: 'https://caiz.test',
        audience: 'mcp-api',
        algorithms: ['RS256'],
        clockSkew: 60 // 60 seconds
    },
    
    // スコープ設定
    scopes: {
        read: 'mcp:read',
        write: 'mcp:write',
        admin: 'mcp:admin'
    }
};
```

## エラーハンドリング

### JWT検証エラーの分類
- `invalid_token`: JWT形式不正、署名検証失敗
- `expired_token`: トークン有効期限切れ（exp）
- `invalid_issuer`: 発行者不正（iss）
- `invalid_audience`: 対象不正（aud）
- `token_not_active`: 有効開始前（nbf）

### JWKS取得エラー
- `jwks_fetch_failed`: JWKSエンドポイント取得失敗
- `invalid_jwks_format`: JWKS形式不正
- `key_not_found`: 対応する公開鍵が見つからない

## セキュリティ考慮事項

### 暗号学的安全性
- RS256署名アルゴリズムの強制
- 公開鍵の検証とサニタイゼーション
- タイミング攻撃対策

### キャッシュセキュリティ
- JWKSキャッシュの適切な有効期限設定
- メモリ使用量の制限
- キャッシュ無効化機能

### エラー情報の制限
- 詳細なエラー情報の内部ログのみ記録
- クライアントには最小限のエラー情報のみ提供
- セキュリティインシデント検出のための監査ログ

### リモート取得の安全性
- JWKS取得は設定済みHTTPSエンドポイントのみに限定（ヘッダー`jku`は無視）
- 企業プロキシ経由時も証明書検証を有効化し、自己署名は許可しない

## パフォーマンス最適化

### JWKSキャッシング
- メモリベースの高速キャッシュ
- TTL（Time To Live）による自動期限切れ
- バックグラウンド更新による可用性確保

### JWT処理最適化
- 署名検証の効率化
- ペイロードパースの最適化
- 並行処理対応

## 参考資料
- [RFC 7517: JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
- [RFC 7518: JSON Web Algorithms (JWA)](https://tools.ietf.org/html/rfc7518)
- [RFC 7519: JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [RFC 6750: OAuth 2.0 Bearer Token Usage](https://tools.ietf.org/html/rfc6750)

## チェックボックス
- [ ] `lib/auth.js`にJWT検証機能追加（インターフェースのみ）