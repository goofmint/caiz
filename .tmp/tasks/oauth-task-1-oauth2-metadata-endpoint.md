# タスク1: OAuth2メタデータエンドポイント

## 概要
OAuth2 Device Authorization Grantフローに対応するため、RFC 8414に準拠したOAuth2認可サーバーメタデータエンドポイントを実装する。Claude Desktop等のMCPクライアントが自動的にOAuth2フローを開始できるようにする。

既存のトークンベースでの認証は廃止とする。

## 重要

NodeBBではなくCaiz。

## 実装対象

### 1. OAuth2メタデータエンドポイント実装

#### /.well-known/oauth-authorization-server
```javascript
// GET /.well-known/oauth-authorization-server
{
  "issuer": "https://caiz.test",
  "authorization_endpoint": "https://caiz.test/oauth/authorize",
  "device_authorization_endpoint": "https://caiz.test/oauth/device_authorization",
  "token_endpoint": "https://caiz.test/oauth/token",
  "grant_types_supported": [
    "urn:ietf:params:oauth:grant-type:device_code",
    "refresh_token"
  ],
  "response_types_supported": ["device_code"],
  "scopes_supported": ["mcp:read", "mcp:search"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "none"],
  "code_challenge_methods_supported": ["S256"],
  "device_authorization_endpoint": "https://caiz.test/oauth/device_authorization"
}
```

### 2. Well-Knownルートハンドラー

#### routes/wellknown.js
```javascript
'use strict';

/**
 * OAuth2認可サーバーメタデータを返却
 */
async function getAuthorizationServerMetadata(req, res) {
    // RFC 8414準拠のメタデータレスポンス構築
    // issuer, endpoints, supported grant types等を設定
    // Content-Type: application/json で応答
}

/**
 * OpenID Connect Discovery（将来拡張用）
 */
async function getOpenidConfiguration(req, res) {
    // OpenID Connect Discoveryエンドポイント
    // 将来的なOpenID Connect対応時に使用
}

module.exports = {
    getAuthorizationServerMetadata,
    getOpenidConfiguration
};
```

### 3. プラグインライブラリ統合

#### library.js更新
```javascript
// Well-knownルートの追加
function initializeWellKnownRoutes(router, middleware, controllers) {
    // /.well-known/oauth-authorization-server ルート登録
    // CORS対応とキャッシュヘッダー設定
    // セキュリティヘッダー追加
}

// OAuth2設定の初期化
function initializeOAuth2Config() {
    // OAuth2関連の設定値読み込み
    // client_id, client_secret等の管理
    // エンドポイントURL構成
}
```

## 設定項目

### OAuth2設定値
```javascript
const oauth2Config = {
    issuer: nconf.get('url'),
    clientId: 'caiz-mcp-server',
    deviceCodeExpiry: 600, // 10分
    accessTokenExpiry: 3600, // 1時間
    refreshTokenExpiry: 7776000, // 90日
    supportedScopes: ['mcp:read', 'mcp:search', 'mcp:write']
};
```

### エンドポイント構成
- `/.well-known/oauth-authorization-server` - OAuth2メタデータ
- `/.well-known/openid_configuration` - OpenID Connect Discovery（将来用）
- CORS対応とキャッシュ制御ヘッダー設定

## セキュリティ考慮事項

### メタデータ応答のセキュリティ
- Content-Type厳密設定（application/json）
- CORS適切な設定
- キャッシュ制御（public, max-age=3600）
- セキュリティヘッダー追加

### 設定値の保護
- client_secretの安全な管理
- エンドポイントURLの動的構成
- 設定値の環境変数対応

## RFC準拠性

### RFC 8414準拠
- 必須フィールドの完全実装
- オプションフィールドの適切な設定
- エラーレスポンス形式の準拠

### 将来拡張性
- OpenID Connect Discovery対応準備
- 追加grant_typeサポート準備
- スコープ拡張対応

## 注意事項

- メタデータエンドポイントは認証不要で公開
- RFC 8414の仕様に厳密準拠
- NodeBBのURL設定に依存した動的構成
- 既存のwell-knownエンドポイントとの競合回避