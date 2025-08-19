# タスク16: Slack新規トピック作成時の通知

## 概要
コミュニティで新規トピックが作成された際に、連携されたSlackワークスペースの指定チャンネルへ通知を送信する機能を実装する。

## 実装範囲
- 新規トピック作成時のフック処理
- Slack通知メッセージの送信
- 通知設定の確認とフィルタリング
- エラーハンドリングとログ出力

## インターフェース設計

### 通知トリガー

```javascript
// plugins/nodebb-plugin-caiz/libs/notifications/slack-topic-notifier.js

class SlackTopicNotifier {
  /**
   * 新規トピック作成時の通知を処理
   * @param {Object} topicData - トピックデータ
   * @param {number} topicData.tid - トピックID
   * @param {number} topicData.cid - カテゴリID
   * @param {number} topicData.uid - 作成者UID
   * @param {string} topicData.title - トピックタイトル
   * @param {string} topicData.content - トピック内容
   * @param {number} topicData.timestamp - 作成日時
   */
  async notifyNewTopic(topicData) {
    // 実装内容:
    // 1. カテゴリがコミュニティ（parentCid === 0）かチェック
    // 2. Slack連携設定の取得と有効性確認
    // 3. 通知設定で新規トピック通知が有効かチェック
    // 4. 作成者情報とトピック詳細の取得
    // 5. Slackメッセージの構築と送信
    // 6. エラーハンドリングとログ出力
  }

  /**
   * Slackメッセージを構築
   * @param {Object} topicData - トピックデータ
   * @param {Object} userData - 作成者データ
   * @param {Object} categoryData - カテゴリデータ
   * @returns {Object} Slackメッセージペイロード
   */
  buildSlackMessage(topicData, userData, categoryData) {
    // 実装内容:
    // 1. NodeBBサイトのベースURLを取得
    // 2. トピックのパーマリンクを生成
    // 3. Slack Block Kit形式のメッセージを構築
    // 4. プレビューテキストの生成（100文字制限）
    // 5. アクションボタン（「トピックを見る」）の追加
  }

  /**
   * Slackにメッセージを送信
   * @param {string} webhookUrl - Slack Webhook URL
   * @param {Object} messagePayload - 送信するメッセージ
   */
  async sendToSlack(webhookUrl, messagePayload) {
    // 実装内容:
    // 1. HTTPS POSTリクエストでSlack Webhook APIを呼び出し
    // 2. レスポンスの確認とエラーハンドリング
    // 3. タイムアウト設定（10秒）
    // 4. リトライ処理は行わない（失敗時はログのみ）
  }
}

module.exports = new SlackTopicNotifier();
```

### フック統合

```javascript
// plugins/nodebb-plugin-caiz/library.js に追加

/**
 * トピック作成後のフック処理
 */
plugin.actionTopicSave = async function(hookData) {
  // 実装内容:
  // 1. hookData.topicからトピックデータを取得
  // 2. SlackTopicNotifierのnotifyNewTopicを呼び出し
  // 3. エラーが発生してもトピック作成は継続（ログのみ出力）
  // 4. 非同期処理で通知送信（トピック作成をブロックしない）
};
```

### 設定管理

```javascript
// plugins/nodebb-plugin-caiz/libs/community-slack-settings.js に追加

/**
 * 通知設定を取得
 * @param {number} cid - コミュニティID
 * @returns {Object} 通知設定
 */
async getNotificationSettings(cid) {
  // 実装内容:
  // 1. community:{cid}:slack:notificationSettingsから設定を取得
  // 2. デフォルト値の設定（新規トピック通知: 有効）
  // 3. 設定オブジェクトを返す
}

/**
 * 通知設定を保存
 * @param {number} cid - コミュニティID
 * @param {Object} settings - 通知設定
 */
async saveNotificationSettings(cid, settings) {
  // 実装内容:
  // 1. 設定の検証
  // 2. community:{cid}:slack:notificationSettingsに保存
  // 3. 成功/失敗の結果を返す
}
```

### WebSocket API

```javascript
// plugins/nodebb-plugin-caiz/library.js に追加

sockets.caiz.getSlackNotificationSettings = async function(socket, data) {
  // 実装内容:
  // 1. ユーザーの権限確認（オーナー/マネージャー）
  // 2. 通知設定の取得
  // 3. 設定データを返す
};

sockets.caiz.saveSlackNotificationSettings = async function(socket, data) {
  // 実装内容:
  // 1. ユーザーの権限確認（オーナー/マネージャー）
  // 2. 設定データの検証
  // 3. 通知設定の保存
  // 4. 成功/失敗を返す
};
```

### クライアントサイド

```javascript
// plugins/nodebb-plugin-caiz/static/community-edit-slack.js に追加

/**
 * 通知設定を読み込んで表示
 */
async loadNotificationSettings() {
  // 実装内容:
  // 1. socket.emit('plugins.caiz.getSlackNotificationSettings')
  // 2. 各チェックボックスの状態を設定
  // 3. エラーハンドリング
}

/**
 * 通知設定を保存
 */
async saveNotificationSettings() {
  // 実装内容:
  // 1. フォームから設定値を取得
  // 2. socket.emit('plugins.caiz.saveSlackNotificationSettings')
  // 3. 成功/エラーメッセージの表示
}
```

## データモデル

### 通知設定

```javascript
// Redis: community:{cid}:slack:notificationSettings
{
  newTopic: boolean,        // 新規トピック通知
  newPost: boolean,         // 新規投稿通知
  memberJoin: boolean,      // メンバー参加通知
  memberLeave: boolean,     // メンバー退出通知
  updatedAt: string        // 最終更新日時
}
```

### Slackメッセージ形式

```javascript
// Slack Block Kit形式のメッセージ
{
  text: "New Topic: Topic Title",
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*New Topic Created*\n\n*Community:* Community Name\n*Title:* Topic Title\n*Author:* Username\n*Created:* Aug 19, 2025 at 1:30 PM"
      }
    },
    {
      type: "section", 
      text: {
        type: "mrkdwn",
        text: "Topic content preview (first 100 characters)..."
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Topic"
          },
          url: "https://example.com/topic/123"
        }
      ]
    }
  ]
}
```

## フック設定

```javascript
// plugin.json に追加
{
  "hook": "action:topic.save",
  "method": "actionTopicSave"
}
```

## エラーハンドリング

1. **Slack設定未接続**: 通知をスキップ（ログ出力のみ）
2. **Webhook送信失敗**: エラーログを出力、トピック作成は継続
3. **ネットワークエラー**: タイムアウト後にエラーログ、リトライなし
4. **権限エラー**: 設定取得/保存時にエラーを返す

## ログ出力

- 通知送信成功: `info`レベル
- 設定取得エラー: `warn`レベル  
- 送信失敗: `error`レベル
- ネットワークエラー: `error`レベル

## UIデザイン

コミュニティ編集モーダルの通知設定に以下を追加：

```html
<!-- Slack接続済み状態のNotification Eventsセクション -->
<div class="form-check mb-2">
  <input type="checkbox" class="form-check-input" id="slack-notify-new-topic" checked>
  <label class="form-check-label" for="slack-notify-new-topic">
    [[caiz:notify-new-topic]]
  </label>
</div>
```

## テスト項目

- [ ] 新規トピック作成時の通知送信
- [ ] Slack未接続時の通知スキップ
- [ ] 通知設定が無効時のスキップ
- [ ] Webhook送信失敗時のエラーハンドリング
- [ ] 権限のないユーザーの設定変更拒否
- [ ] メッセージ形式の確認（Block Kit形式）
- [ ] 長いコンテンツのプレビュー切り詰め