# タスク19: Slack向けメンバー退出通知

## 概要

コミュニティからメンバーが退出した時に、Slackへ通知を送信する機能を実装する。

## 機能要件

### 基本機能
- メンバー退出時にSlack通知を送信
- 通知設定で「メンバー退出」がONの場合のみ通知
- 退出したユーザー情報の表示
- 退出後の残りメンバー数表示

### 通知条件
- コミュニティにSlackが接続されている
- 通知設定で「メンバー退出」が有効
- 実際にメンバーが退出した場合（ゲストや未参加者の操作は除外）
- 管理者によるメンバー削除は、退出として通知しない

## 技術仕様

### フック対象
- WebSocket API `plugins.caiz.unfollowCommunity` の成功時

### 通知メソッド拡張
```javascript
// SlackTopicNotifier クラスへの追加メソッド
class SlackTopicNotifier {
    /**
     * メンバー退出通知を送信
     * @param {Object} leaveData - メンバー退出データ
     * @param {number} leaveData.uid - 退出したユーザーID
     * @param {number} leaveData.cid - コミュニティID
     * @param {string} leaveData.reason - 退出理由（'voluntary'｜'removed'）
     * @param {number} leaveData.timestamp - 退出日時
     */
    async notifyMemberLeave(leaveData) {
        // 1. コミュニティ情報を取得（parentCid === 0を確認）
        // 2. Slack接続状況と通知設定を確認
        // 3. 退出したユーザー情報を取得
        // 4. 残りメンバー数を取得
        // 5. Slack Block Kitメッセージを構築
        // 6. Slack Webhook経由で通知送信
    }

    /**
     * メンバー退出通知用のSlack Block Kitメッセージを構築
     * @param {Object} userData - 退出したユーザーデータ
     * @param {Object} communityData - コミュニティデータ
     * @param {string} reason - 退出理由
     * @param {number} remainingMembers - 残りメンバー数
     * @returns {Object} Slack Block Kit形式のメッセージ
     */
    buildSlackMemberLeaveMessage(userData, communityData, reason, remainingMembers) {
        // Block Kit形式のメッセージを構築
        // - ヘッダー: Member left / Member removed
        // - ユーザー情報
        // - コミュニティ名
        // - 残りメンバー数
        // - 退出日時
    }
}
```

### WebSocket API実装
```javascript
// sockets.caiz.unfollowCommunity 内での処理
sockets.caiz.unfollowCommunity = async function(socket, data) {
    // 既存のメンバー削除処理...
    
    // 実際に退出が成功した場合のみ通知
    if (previousRole !== 'guest') {
        setImmediate(async () => {
            try {
                const slackTopicNotifier = require('./libs/notifications/slack-topic-notifier');
                await slackTopicNotifier.notifyMemberLeave({
                    uid: socket.uid,
                    cid: data.cid,
                    reason: 'voluntary',
                    timestamp: Date.now()
                });
            } catch (err) {
                winston.error(`[plugin/caiz] Error in member leave notification: ${err.message}`);
            }
        });
    }
    
    // 既存のレスポンス処理...
};
```

## メッセージ例

### 自主退出の場合
```
👋 Member left

👤 nakatsugawa has left the community

📍 goofmint Community
👥 Remaining members: 41
🕒 January 19, 2025 at 4:30 PM
```

## 実装順序

1. `SlackTopicNotifier`に`notifyMemberLeave`メソッドを追加
2. `buildSlackMemberLeaveMessage`メソッドの実装
3. `unfollowCommunity` WebSocket APIでの通知呼び出し
5. 通知設定の確認処理
6. テスト・デバッグ

## 注意点

- ロール変更は退出として扱わない
- オーナー退出の特殊ケース処理
- BANされた場合の処理も考慮
- 残りメンバー数のパフォーマンスに注意
