# タスク18: Slack向け新規メンバー参加通知

## 概要

コミュニティに新規メンバーが参加した時に、Slackへ通知を送信する機能を実装する。

## 機能要件

### 基本機能
- 新規メンバー参加時にSlack通知を送信
- 通知設定で「メンバー参加」がONの場合のみ通知
- 参加したユーザー情報の表示
- コミュニティページへのリンク提供

### 通知条件
- コミュニティにSlackが接続されている
- 通知設定で「メンバー参加」が有効
- ユーザーがメンバーロールとして参加（バンや退出は除外）

## 技術仕様

### フック
- WebSocket API `plugins.caiz.followCommunity` の成功時に通知を発火

### 通知メソッド拡張
```javascript
// SlackTopicNotifier クラスへの追加メソッド
class SlackTopicNotifier {
    /**
     * 新規メンバー参加通知を送信
     * @param {Object} memberData - メンバー参加データ
     * @param {number} memberData.uid - 参加したユーザーID
     * @param {number} memberData.cid - コミュニティID
     * @param {string} memberData.role - 付与されたロール（'member'）
     * @param {number} memberData.timestamp - 参加日時
     */
    async notifyMemberJoin(memberData) {
        // 1. コミュニティ情報を取得（parentCid === 0を確認）
        // 2. Slack接続状況と通知設定を確認
        // 3. 参加したユーザー情報を取得
        // 4. Slack Block Kitメッセージを構築
        // 5. Slack Webhook経由で通知送信
    }

    /**
     * メンバー参加通知用のSlack Block Kitメッセージを構築
     * @param {Object} userData - 参加したユーザーデータ
     * @param {Object} communityData - コミュニティデータ
     * @param {string} role - 付与されたロール
     * @returns {Object} Slack Block Kit形式のメッセージ
     */
    buildSlackMemberJoinMessage(userData, communityData, role) {
        // Block Kit形式のメッセージを構築
        // - ヘッダー: New member joined
        // - ユーザー情報とアバター
        // - コミュニティ名
        // - 参加日時
        // - View Community ボタン
    }
}
```

### WebSocket API実装
```javascript
// sockets.caiz.followCommunity 内での処理
sockets.caiz.followCommunity = async function(socket, data) {
    // 既存のメンバー追加処理...
    
    // 通知処理を非同期で実行
    setImmediate(async () => {
        try {
            const slackTopicNotifier = require('./libs/notifications/slack-topic-notifier');
            await slackTopicNotifier.notifyMemberJoin({
                uid: socket.uid,
                cid: data.cid,
                role: 'member',
                timestamp: Date.now()
            });
        } catch (err) {
            winston.error(`[plugin/caiz] Error in member join notification: ${err.message}`);
        }
    });
    
    // 既存のレスポンス処理...
};
```

## メッセージ例

```
🎉 New member joined!

👤 nakatsugawa has joined the community

📍 goofmint Community
👥 Total members: 42
🕒 January 19, 2025 at 3:30 PM

👀 View Community
```

## 実装順序

1. `SlackTopicNotifier`に`notifyMemberJoin`メソッドを追加
2. `buildSlackMemberJoinMessage`メソッドの実装
3. `followCommunity` WebSocket APIでの通知呼び出し
4. 通知設定の確認処理
5. テスト・デバッグ

## 注意点

- 通知は既存の仕組みを利用
- メンバー退出通知との区別を明確にする
- ロール変更（マネージャー昇格等）は通知不要
- 自己参加（コミュニティ作成者）は通知しない
- メンバー数の取得処理のパフォーマンスに注意