# タスク21: Discord向け新規コメント通知

## 概要

コミュニティで新規コメント（返信）が作成された時に、Discordへ通知を送信する機能を実装する。Slack版の実装を参考にして、可能な限り共通化を図る。

## 機能要件

### 基本機能
- 新規コメント作成時にDiscord通知を送信
- 通知設定で「新規コメント」がONの場合のみ通知
- Discord Embedsを使用したリッチな表示
- コメントへの直接リンク提供（アンカー付き）

### 通知条件
- コミュニティにDiscordが接続されている
- 通知設定で「新規コメント」が有効
- メインポスト（新規トピック）は除外（既にトピック通知で処理済み）
- コメントがコミュニティ下のいずれのカテゴリであっても通知対象

## 技術仕様

### 既存の共通基盤を活用

```javascript
// libs/notifications/notifier-base.js - 既存の共通クラスを活用
class NotifierBase {
    /**
     * ルートコミュニティ特定（既存）
     */
    async findRootCommunity(cid) {
        // 既存実装を使用
    }

    /**
     * コンテンツプレビュー作成（既存）
     */
    formatContentPreview(content, maxLength = 200) {
        // 既存実装を使用
    }
}
```

### Discord通知実装

```javascript
// libs/notifications/discord-notifier.js - 既存クラスに機能追加
class DiscordNotifier extends NotifierBase {
    /**
     * 新規コメント通知（追加実装）
     * @param {Object} postData - コメントデータ
     */
    async notifyNewComment(postData) {
        // 1. トピック情報を取得
        // 2. ルートコミュニティを特定（基底クラスのメソッド使用）
        // 3. Discord設定を確認
        // 4. ユーザー情報とコメント詳細を取得
        // 5. Discord Embedメッセージを構築
        // 6. Webhookで送信
    }

    /**
     * Discord Embed形式のコメント通知メッセージを構築（追加実装）
     * @param {Object} commentData - コメントデータ
     * @param {Object} topicData - 親トピックデータ
     * @param {Object} userData - ユーザーデータ
     * @param {Object} communityData - コミュニティデータ
     * @param {Object} categoryData - カテゴリデータ
     * @returns {Object} Discord Embed形式のメッセージ
     */
    buildDiscordCommentMessage(commentData, topicData, userData, communityData, categoryData) {
        // Discord Embed形式でコメント通知メッセージを構築
        // - title: "Re: [トピック名]"
        // - description: コメント内容のプレビュー
        // - author: コメント投稿者情報
        // - url: コメントへの直接リンク（#[pid]アンカー付き）
        // - color: 緑系の色（コメント用）
        // - fields: コミュニティ名、カテゴリ名
        // - footer: "💬 New Comment"
        // - timestamp: 投稿日時
    }
}
```

### 統合処理での呼び出し

```javascript
// library.js - 既存のactionPostSaveフックで呼び出し
plugin.actionPostSave = async function(hookData) {
    // 既存のメインポストチェック処理
    if (!post || post.pid === mainPid) {
        return; // トピック作成は別の通知で処理
    }

    // Slack通知（既存）
    setImmediate(async () => {
        const slackNotifier = require('./libs/notifications/slack-topic-notifier');
        await slackNotifier.notifyNewComment(post);
    });
    
    // Discord通知（新規追加）
    setImmediate(async () => {
        const discordNotifier = require('./libs/notifications/discord-notifier');
        await discordNotifier.notifyNewComment(post);
    });
};
```

## メッセージ例（Discord Embed形式）

```json
{
  "embeds": [{
    "title": "Re: How to implement custom hooks in React?",
    "description": "You can use the useEffect hook to manage state and side effects...",
    "url": "https://community.example.com/topic/custom-hooks-react/71#71",
    "color": 5763719,
    "author": {
      "name": "john_doe",
      "icon_url": "https://community.example.com/avatar/john_doe.png"
    },
    "fields": [
      {
        "name": "Community",
        "value": "goofmint Community",
        "inline": true
      },
      {
        "name": "Category", 
        "value": "General Discussion",
        "inline": true
      }
    ],
    "footer": {
      "text": "💬 New Comment"
    },
    "timestamp": "2025-01-19T15:35:00.000Z"
  }]
}
```

## 実装順序

1. 既存の`DiscordNotifier`クラスに`notifyNewComment`メソッドを追加
2. `buildDiscordCommentMessage`メソッドを実装
3. `library.js`の`actionPostSave`フックにDiscord通知処理を追加
4. テスト・デバッグ

## 注意点

- Slack版の`notifyNewComment`実装を参考にする
- 既存の`buildDiscordCommentMessage`メソッド（トピック20で実装済み）を活用
- `notifyNewTopic`との共通処理は基底クラスのメソッドを活用
- エラーハンドリングの充実
- 非同期処理での適切な例外処理