# タスク33: MCPサーバー - メタデータ公開

## 概要
OAuth 2.0 Resource Server Metadataを公開するエンドポイント `/.well-known/oauth-protected-resource` を実装します。このエンドポイントは、MCPクライアントが当サーバーのリソース保護情報を取得するために使用されます。

## 目的
- RFC 8414に準拠したリソースサーバーメタデータの公開
- MCPクライアントによる自動設定のサポート
- OAuth 2.0認証フローの準備

## エンドポイント仕様

### `GET /.well-known/oauth-protected-resource`

OAuth 2.0 Resource Server Metadataを返します。

#### レスポンス形式
```javascript
{
  "resource": "https://caiz.test",
  "authorization_servers": ["https://caiz.test"],
  "jwks_uri": "https://caiz.test/.well-known/jwks.json",
  "scopes_supported": [
    "mcp:read",
    "mcp:write",
    "mcp:admin"
  ],
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"]
}
```

## インターフェース設計

### 新規ファイル: `lib/metadata.js`
```javascript
/**
 * OAuth 2.0 Resource Server Metadata provider
 * Implements RFC 8414 specification
 */
class ResourceServerMetadata {
    /**
     * Get resource server metadata
     * @returns {Object} Resource server metadata object
     */
    static getMetadata() {
        // Returns standardized metadata structure
        // Implementation details will be added in next phase
    }
    
    /**
     * Validate metadata configuration
     * @returns {boolean} Validation result
     */
    static validateConfiguration() {
        // Validates current configuration
        // Implementation details will be added in next phase
    }
}
```

### 既存ファイル更新: `routes/mcp.js`
新しいエンドポイント `/.well-known/oauth-protected-resource` を追加します。

```javascript
/**
 * OAuth 2.0 Resource Server Metadata endpoint
 * GET /.well-known/oauth-protected-resource
 */
router.get('/.well-known/oauth-protected-resource', (req, res) => {
    // Implementation will be added in next phase
    // Returns RFC 8414 compliant metadata
});
```

## セキュリティ考慮事項
- メタデータは公開情報のため認証は不要
- HTTPS必須（本番環境）
- 適切なCORSヘッダーの設定
- レート制限の適用検討

## 参考資料
- [RFC 8414: OAuth 2.0 Authorization Server Metadata](https://tools.ietf.org/html/rfc8414)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)

## チェックボックス
- [ ] `lib/metadata.js` ファイルの作成（インターフェースのみ）
- [ ] `routes/mcp.js` に `/.well-known/oauth-protected-resource` エンドポイント追加
- [ ] メタデータのJSON構造定義
- [ ] セキュリティヘッダーの適用
- [ ] ドキュメントの整備