# タスク20: Discord向け新規トピック通知

## 概要

コミュニティで新規トピックが作成された時に、Discordへ通知を送信する機能を実装する。Slack版の実装を基に、可能な限り共通化を図る。

## 機能要件

### 基本機能
- 新規トピック作成時にDiscord通知を送信
- 通知設定で「新規トピック」がONの場合のみ通知
- Discord Embedsを使用したリッチな表示
- トピックへのリンク提供

### 通知条件
- コミュニティにDiscordが接続されている
- 通知設定で「新規トピック」が有効
- トピックがコミュニティ下のいずれのカテゴリであっても通知対象
  - トピックの一番親のカテゴリ（parentCid === 0）を特定

## 技術仕様

### 共通通知基盤の実装
```javascript
// libs/notifications/notifier-base.js
class NotifierBase {
    /**
     * 基底クラス：通知処理の共通ロジック
     */
    constructor() {
        this.baseUrl = require('nconf').get('url');
    }

    /**
     * コミュニティの特定（共通処理）
     * @param {number} cid - カテゴリID
     * @returns {Object|null} ルートコミュニティのデータ
     */
    async findRootCommunity(cid) {
        // カテゴリ階層を辿ってparentCid === 0を探す
        // Slack/Discord共通で使用
    }

    /**
     * 通知設定の確認（プラットフォーム別に実装）
     * @abstract
     */
    async checkNotificationSettings(cid, notificationType) {
        throw new Error('Must implement checkNotificationSettings');
    }

    /**
     * メッセージ送信（プラットフォーム別に実装）
     * @abstract
     */
    async sendMessage(settings, message) {
        throw new Error('Must implement sendMessage');
    }
}
```

### Discord通知クラス
```javascript
// libs/notifications/discord-notifier.js
class DiscordNotifier extends NotifierBase {
    /**
     * Discord通知設定の確認
     * @param {number} cid - コミュニティID
     * @param {string} notificationType - 通知タイプ（'newTopic', 'newPost', etc）
     * @returns {Object|null} Discord設定（botToken, channelId, notifications）
     */
    async checkNotificationSettings(cid, notificationType) {
        // 1. Discord接続設定を取得
        // 2. 通知タイプの有効性を確認
        // 3. botTokenとchannelIdの存在確認
    }

    /**
     * Discord APIへメッセージ送信
     * @param {Object} settings - Discord設定（botToken, channelId）
     * @param {Object} message - Discord Embed形式のメッセージ
     */
    async sendMessage(settings, message) {
        // fetch APIを使用してDiscord Webhookまたはbot APIへ送信
        // Embedsフォーマットで送信
    }

    /**
     * 新規トピック通知
     * @param {Object} topicData - トピックデータ
     */
    async notifyNewTopic(topicData) {
        // 1. ルートコミュニティを特定（基底クラスのメソッド使用）
        // 2. Discord設定を確認
        // 3. トピック詳細とユーザー情報を取得
        // 4. Discord Embedメッセージを構築
        // 5. Discord APIへ送信
    }

    /**
     * Discord Embed形式のトピック通知メッセージを構築
     * @param {Object} topicData - トピックデータ
     * @param {Object} userData - ユーザーデータ
     * @param {Object} communityData - コミュニティデータ
     * @returns {Object} Discord Embed形式のメッセージ
     */
    buildDiscordTopicMessage(topicData, userData, communityData) {
        // Discord Embed形式でメッセージを構築
        // - title: 新規トピックのタイトル
        // - description: 内容のプレビュー
        // - author: 投稿者情報
        // - timestamp: 作成日時
        // - url: トピックへのリンク
        // - color: 青系の色（新規トピック用）
    }
}
```

### 統合処理の修正
```javascript
// library.js の actionTopicSave フック
plugin.actionTopicSave = async function(hookData) {
    // Slack通知（既存）
    setImmediate(async () => {
        const slackNotifier = require('./libs/notifications/slack-topic-notifier');
        await slackNotifier.notifyNewTopic(topicData);
    });
    
    // Discord通知（新規）
    setImmediate(async () => {
        const discordNotifier = require('./libs/notifications/discord-notifier');
        await discordNotifier.notifyNewTopic(topicData);
    });
};
```

## メッセージ例（Discord Embed形式）

```json
{
  "embeds": [{
    "title": "How to implement custom hooks in React?",
    "description": "I'm trying to create a custom hook for managing form state...",
    "url": "https://community.example.com/topic/custom-hooks-react",
    "color": 3447003,
    "author": {
      "name": "nakatsugawa",
      "icon_url": "https://community.example.com/avatar/nakatsugawa.png"
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
      "text": "New Topic"
    },
    "timestamp": "2025-01-19T15:30:00.000Z"
  }]
}
```

## 実装順序

1. `NotifierBase`基底クラスの作成（共通化）
2. `DiscordNotifier`クラスの実装
3. `buildDiscordTopicMessage`メソッドの実装
4. Discord API送信処理の実装
5. `library.js`への統合
6. テスト・デバッグ

## 注意点

- Slack版との共通化を最大限に活用
- Discord EmbedとSlack Block Kitの違いに注意
- Discord Bot TokenまたはWebhook URLの使い分け
- レート制限への対応（Discord APIは厳しめ）
- エラーハンドリングの充実
