# タスク43: X(Twitter)への通知機能

## 概要
コミュニティの活動（新規トピック、新規コメント、メンバー参加/退出）をX(Twitter)に自動投稿する機能を実装します。SlackやDiscordへの通知と同様のイベントをトリガーとして、X APIを通じて投稿を行います。

## 機能要件

### 1. 通知対象イベント

- 新規トピック作成
- 新規コメント投稿
- 新規メンバー参加
- メンバー退出

### 2. 投稿内容
- コミュニティ名
- イベントタイプ
- トピックタイトル（新規トピック/コメントの場合）
- ユーザー名（メンバー参加/退出の場合）
- トピックへのリンク

### 3. 管理画面設定項目
- X APIキー
- X シークレットキー

### 4. コミュニティ編集画面の設定項目

- Xアカウントの連結（コールバック受け取り）
- 通知の有効/無効切り替え（イベントタイプごと）

## 技術設計

### データ構造

```javascript
// コミュニティごとのX通知設定
{
  cid: Number,              // Community ID
  xConfig: {
    enabled: Boolean,       // 通知機能の有効/無効
    accounts: [             // 接続済みXアカウント群
      {
        accountId: String,      // XのユーザーID
        screenName: String,     // 表示用(@username)
        accessToken: String,    // 暗号化保存
        refreshToken: String,   // 暗号化保存
        expiresAt: Number,      // epoch(ms)
        scopes: [String],       // 付与スコープ(tweet.write等)
        default: Boolean        // 既定アカウント
      }
    ],
    selectedAccountId: String,  // 投稿に用いる既定アカウント
    events: {
      newTopic: Boolean,    // 新規トピック通知
      newPost: Boolean,     // 新規コメント通知  
      memberJoin: Boolean,  // メンバー参加通知
      memberLeave: Boolean  // メンバー退出通知
    },
    templates: {
      newTopic: String,     // カスタムテンプレート
      newPost: String,      // カスタムテンプレート
      memberJoin: String,   // カスタムテンプレート
      memberLeave: String   // カスタムテンプレート
    }
  }
}
```

### APIインターフェース

```javascript
// X通知設定の取得
async function getXNotificationConfig(cid) {
  // コミュニティのX通知設定を取得
  // トークン値そのものは返さない（マスク/有無のみ）
}

// X通知設定の保存
async function setXNotificationConfig(cid, config) {
  // 接続済みアカウント/選択状態/テンプレート/イベント設定を検証して保存
  // 設定を検証してから保存
}

// X アカウント接続開始（OAuth 2.0 PKCE フロー）
async function startXOAuth(cid) {
  // 認証URLを生成し、state/code_verifierを保存
  // リダイレクトURIを含む認証URLを返す
}

// 認可コールバック処理（トークン保存）
async function completeXOAuth(cid, params) {
  // authorization codeをトークンに交換
  // アカウント情報取得とトークン暗号化保存
}

// アクセストークンのリフレッシュ
async function refreshXToken(accountId) {
  // refresh_tokenを使用してaccess_tokenを更新
  // 新しいトークンと有効期限を保存
}

// 接続済みアカウント一覧/選択
async function listXAccounts(cid) {
  // cidに紐づく全アカウント情報を返す（トークンはマスク）
}

async function selectXAccount(cid, accountId) {
  // デフォルトアカウントを設定
}

// X APIへの投稿
async function postToX(accountId, message) {
  // アカウントIDからトークンを取得（必要に応じてリフレッシュ）
  // X API v2でポストを作成（ユーザーコンテキスト）
  // エラーハンドリングとリトライ機能を含む
}

// 通知イベントハンドラ
async function handleXNotification(event) {
  // イベントタイプに応じた通知処理
  // 可視性チェック（非公開コミュニティは投稿しない）
  // 文字数・URL整形 → テンプレート適用 → 投稿
}
```

### フック登録

```javascript
// library.js
plugin.hooks = {
  // トピック作成時
  'action:topic.save': async function(data) {
    // X通知処理を呼び出し
  },
  
  // コメント投稿時
  'action:post.save': async function(data) {
    // X通知処理を呼び出し
  },
  
  // メンバー参加時
  'action:group.join': async function(data) {
    // X通知処理を呼び出し
  },
  
  // メンバー退出時
  'action:group.leave': async function(data) {
    // X通知処理を呼び出し
  }
};
```

### 管理画面UI

```javascript
// templates/admin/x-notification.tpl
// X通知設定画面のテンプレート
// - 「Xアカウントを接続」ボタン（OAuth 2.0）
// - 接続済みアカウント一覧（選択/削除/再接続）
// - イベントタイプごとの有効/無効チェックボックス
// - テンプレートカスタマイズテキストエリア
// - テスト投稿ボタン

// static/admin-x-notification.js
// 管理画面のクライアントサイドロジック
// - 設定の保存/読み込み（選択アカウント・テンプレート・イベント）
// - アカウント接続フロー開始/完了処理
// - テスト投稿（選択アカウントで実行）
// - トークン有効期限の表示と再接続導線
```

## セキュリティ考慮事項

1. **レート制限**
   - X APIのレート制限に対応
   - 投稿間隔の制御（最小1分間隔）
   - エラー時の再試行制限

2. **権限管理**
   - コミュニティオーナーのみ設定変更可能
   - システム管理者による監査ログ

## エラーハンドリング

1. **API失敗時**
   - 一時的なキューに保存
   - 指数バックオフでリトライ
   - 3回失敗後は破棄してログ記録

2. **トークン無効時**
   - 管理者に通知
   - 自動的に通知を無効化
   - 再設定を促すメッセージ表示

## テスト計画

1. **単体テスト**
   - トークン暗号化/復号化
   - テンプレート処理
   - API呼び出しのモック

2. **統合テスト**
   - イベント発火から投稿まで
   - エラーケースの処理
   - レート制限対応

## 実装ステップ

1. データモデルと設定管理の実装
2. X API クライアントの実装
3. イベントハンドラの実装
4. 管理画面UIの実装
5. テストとドキュメント作成