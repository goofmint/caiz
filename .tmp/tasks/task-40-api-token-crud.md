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
  token_id: 'uuid_v7_unique',              // 公開識別子（レスポンスに含む）
  uid: 'user_id_foreign_key',
  name: 'token_display_name',
  token_prefix: 'char(8)',                 // UX用（secret先頭8文字）
  token_hash: 'hmac_sha256_hex',           // 秘密値のHMAC
  permissions: 'json_array',               // 許可スコープの配列
  is_active: 'boolean_default_true',
  created_at: 'timestamp',
  updated_at: 'timestamp',
  last_used_at: 'timestamp_nullable',
  expires_at: 'timestamp_nullable',        // 任意の有効期限
  revoked_at: 'timestamp_nullable'         // 失効日時（ソフトデリート）
}

// 制約/インデックス:
// - UNIQUE(token_id), UNIQUE(token_hash), UNIQUE(uid, LOWER(name))
// - INDEX(uid), INDEX(uid, token_prefix)
// - CHECK(permissions ⊆ 許可済みスコープ集合)
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

#### apiTokens.update
APIトークンのメタデータを更新する（トークン本体は更新不可）

```javascript
sockets.apiTokens.update = async function(socket, data) {
  // 認証チェック
  // 所有者確認（もしくは管理権限の検証）
  // 入力バリデーション
  //  - 更新可能フィールド: name, is_active, permissions, expires_at
  //  - name は同一ユーザー内で一意（ケースインセンシティブ）
  //  - permissions は許可済みスコープのみ
  //  - expires_at は過去日時不可、最大TTLを超過不可
  // DB更新（updated_at を更新）
  // 監査ログに記録
  // 成功レスポンス: 更新後のメタデータ
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
// 仕様:
//  - secret は 32 bytes (256-bit) 以上の乱数
//  - エンコードは base64url（パディングなし）
//  - token_id は UUIDv7（表示や監査、O(1) ルックアップに使用）
//  - token_prefix は secret の先頭8文字（表示・UX用、重複の可能性あり）
//  - クライアントに返す文字列: `${token_id}.${secretB64u}`
function generateApiToken() {
  // crypto.randomBytes(32)
  // token_id = uuidv7()
  // secretB64u = base64url(secret)
  // prefix = secretB64u.slice(0, 8)
  // return { token: `${token_id}.${secretB64u}`, tokenId: token_id, prefix }
}
```

#### ハッシュ化機能
```javascript
// トークンハッシュ化（保存用）
// 推奨: HMAC-SHA-256(token) with server-side pepper/secret
function hashToken(token, pepper) {
  // 例:
  //   const hmac = crypto.createHmac('sha256', pepper);
  //   return hmac.update(token).digest('hex');
}

// トークン検証（認証時用）
function verifyToken(token, storedHash, pepper) {
  // 計算:
  //   const expected = crypto
  //     .createHmac('sha256', pepper)
  //     .update(token)
  //     .digest('hex');
  // 比較:
  //   const actual = Buffer.from(storedHash, 'hex');
  //   const predicted = Buffer.from(expected, 'hex');
  //   return crypto.timingSafeEqual(predicted, actual);
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