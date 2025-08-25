# Task 37: 認証済セッション応答の再実装

## 概要
APIトークン管理機能が完成したので、正しいAPIトークンを使用した認証済みセッションに対して適切なユーザー情報を返すセッション応答機能を実装する。

## 実装対象

### 1. APIトークン認証機能

#### トークン検証
```javascript
async function validateApiToken(token) {
  // トークンの形式チェック (UUID.base64url)
  // データベースからトークン情報取得
  // ハッシュ値検証
  // 有効性チェック (is_active, expires_at, revoked_at)
  // ユーザー情報返却
}
```

#### Bearer認証ヘッダー処理
```javascript
function extractBearerToken(authHeader) {
  // Authorization: Bearer {token} の抽出
  // 形式バリデーション
  // トークン文字列返却
}
```

### 2. セッション情報応答機能

#### GET /api/mcp/session エンドポイント拡張
```javascript
router.get('/api/mcp/session', async (req, res) => {
  // Bearer トークン抽出
  // トークン認証実行
  // ユーザーセッション情報構築
  // 200レスポンス返却
}
```

#### 応答データ構造
```javascript
{
  "status": "authenticated",
  "user": {
    "uid": "user_id",
    "username": "username", 
    "email": "email_address",
    "displayname": "display_name"
  },
  "token": {
    "id": "token_id",
    "name": "token_name",
    "permissions": ["read", "write"],
    "created_at": "timestamp",
    "last_used_at": "timestamp"
  },
  "capabilities": {
    "mcp_version": "1.0",
    "supported_tools": ["search", "read"],
    "max_message_size": 1048576
  }
}
```

### 3. 認証失敗ハンドリング

#### エラーレスポンス
- 401: 無効なトークン
- 403: 無効化されたトークン
- 403: 期限切れトークン
- 400: 形式不正なトークン

#### WWW-Authenticate ヘッダー
```javascript
res.setHeader('WWW-Authenticate', 'Bearer realm="NodeBB API"');
```

### 4. トークン使用状況記録

#### last_used_at 更新
```javascript
async function updateTokenLastUsed(tokenId) {
  // 最終使用日時を現在時刻に更新
  // データベース更新処理
}
```

### 5. セキュリティ考慮事項

#### レート制限
- 同一IPからの認証試行回数制限
- トークンごとのリクエスト頻度制限

#### ログ記録
- 認証成功・失敗のログ記録
- 不正アクセス試行の監視

#### 情報露出防止
- エラーメッセージでトークン存在の有無を隠蔽
- タイミング攻撃対策

## 注意事項

- 既存のJWT認証との共存
- NodeBBの認証システムとの整合性
- APIトークンのセキュアな検証
- パフォーマンスを考慮したトークンキャッシュ
- 国際化対応（エラーメッセージ）