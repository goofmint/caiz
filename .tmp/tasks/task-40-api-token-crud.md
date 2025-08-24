# Task 40: APIトークンのCRUD実装

## 概要
ユーザーがAPIトークンを作成、更新、削除できる機能を実装する。既存のUIは完成しているため、サーバーサイドの実装を行う。

## 実装対象

### 1. データベーススキーマ設計
APIトークンを保存するためのデータベーステーブル設計

```javascript
// api_tokens テーブル構造
{
  id: 'auto_increment_primary_key',
  uid: 'user_id_foreign_key',
  name: 'token_display_name',
  token_hash: 'hashed_token_value', // セキュリティのためハッシュ化
  created_at: 'timestamp',
  last_used_at: 'timestamp_nullable',
  is_active: 'boolean_default_true',
  permissions: 'json_array_or_string' // 将来の権限管理用
}
```

### 2. WebSocketハンドラー実装

#### apiTokens.get
現在のユーザーのAPIトークン一覧を取得する

```javascript
sockets.apiTokens.get = async function(socket, data) {
  // 認証チェック
  // データベースからユーザーのトークン一覧を取得
  // 機密情報（トークン本体）は除外して返却
}
```

#### apiTokens.create
新しいAPIトークンを作成する

```javascript
sockets.apiTokens.create = async function(socket, data) {
  // 認証チェック
  // 入力バリデーション（name必須、文字数制限等）
  // ランダムトークン生成
  // ハッシュ化してデータベース保存
  // 生成したトークンを一度だけ返却
}
```

#### apiTokens.delete
APIトークンを削除する

```javascript
sockets.apiTokens.delete = async function(socket, data) {
  // 認証チェック
  // トークン所有者確認
  // データベースから削除
}
```

### 3. トークン管理ユーティリティ

#### トークン生成機能
```javascript
// セキュアなランダムトークン生成
function generateApiToken() {
  // crypto.randomBytesを使用
  // base64url形式で返却
}
```

#### ハッシュ化機能
```javascript
// トークンハッシュ化（保存用）
function hashToken(token) {
  // bcryptまたはcrypto.createHashを使用
}

// トークン検証（認証時用）
function verifyToken(token, hash) {
  // ハッシュ値との比較
}
```

### 4. バリデーション機能

#### 入力チェック
- トークン名：必須、1-100文字
- 重複チェック：同一ユーザー内でのトークン名重複防止
- レート制限：トークン作成の頻度制限

### 5. セキュリティ考慮事項

#### データ保護
- トークン本体はデータベースに保存しない（ハッシュのみ）
- 生成時のレスポンスでのみトークン本体を返却
- ログにトークンを出力しない

#### アクセス制御
- 自分のトークンのみアクセス可能
- 管理者でも他のユーザーのトークンは閲覧不可

## 注意事項

- 既存のUIは変更しない
- エラーハンドリングを適切に行う
- 国際化対応（エラーメッセージも翻訳キー使用）
- NodeBBのデータベース抽象化レイヤーを使用
- 既存のWebSocketイベント名を維持する