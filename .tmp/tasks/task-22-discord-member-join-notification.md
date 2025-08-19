# タスク22: Discord向け新規メンバー参加通知

## 概要

コミュニティに新規メンバーが参加した時に、Discordへ通知を送信する機能を実装する。Slack版の実装を参考にして、可能な限り共通化を図る。

## 機能要件

### 基本機能
- メンバー参加時にDiscord通知を送信
- 通知設定で「メンバー参加」がONの場合のみ通知
- Discord Embedsを使用したリッチな表示
- コミュニティへの直接リンク提供
- 現在の総メンバー数を表示

### 通知条件
- コミュニティにDiscordが接続されている
- 通知設定で「メンバー参加」が有効
- 参加者がルートコミュニティ（parentCid === 0）に参加した場合のみ
- サブカテゴリへの参加は通知対象外

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
}
```

### Discord通知実装

```javascript
// libs/notifications/discord-notifier.js - 既存クラスに機能追加
class DiscordNotifier extends NotifierBase {
    /**
     * 新規メンバー参加通知（追加実装）
     * @param {Object} memberData - メンバー参加データ
     */
    async notifyMemberJoin(memberData) {
        // 1. ルートコミュニティかどうか確認（基底クラスのメソッド使用）
        // 2. Discord設定を確認
        // 3. 参加者情報を取得
        // 4. 現在の総メンバー数を取得
        // 5. Discord Embedメッセージを構築
        // 6. Webhookで送信
    }

    /**
     * Discord Embed形式のメンバー参加通知メッセージを構築（追加実装）
     * @param {Object} userData - 参加者データ
     * @param {Object} communityData - コミュニティデータ
     * @param {number} totalMembers - 総メンバー数
     * @returns {Object} Discord Embed形式のメッセージ
     */
    buildDiscordMemberJoinMessage(userData, communityData, totalMembers) {
        // Discord Embed形式でメンバー参加通知メッセージを構築
        // - title: "🎉 New member joined!"
        // - description: "[ユーザー名] has joined the community"
        // - url: コミュニティURL
        // - color: 金色（参加祝い用）
        // - thumbnail: 参加者のアバター
        // - fields: コミュニティ名、総メンバー数
        // - footer: "👥 Member Joined"
        // - timestamp: 参加日時
    }
}
```

### Community Follow処理での呼び出し

```javascript
// libs/community/core.js - Follow関数で呼び出し
async function Follow(socket, data) {
    // 既存のフォロー処理...
    
    // Send member join notifications (non-blocking)
    setImmediate(async () => {
        try {
            const discordNotifier = require('../notifications/discord-notifier');
            await discordNotifier.notifyMemberJoin({
                uid: uid,
                cid: targetCid,
                role: 'member',
                timestamp: Date.now()
            });
        } catch (err) {
            winston.error(`[plugin/caiz] Error in Discord member join notification: ${err.message}`);
        }
    });
}
```

## メッセージ例（Discord Embed形式）

```json
{
  "embeds": [{
    "title": "🎉 New member joined!",
    "description": "**nakatsugawa** has joined the community",
    "url": "https://community.example.com/goofmint",
    "color": 15844367,
    "thumbnail": {
      "url": "https://community.example.com/avatar/nakatsugawa.png"
    },
    "fields": [
      {
        "name": "Community",
        "value": "goofmint Community",
        "inline": true
      },
      {
        "name": "Total Members", 
        "value": "127",
        "inline": true
      }
    ],
    "footer": {
      "text": "👥 Member Joined"
    },
    "timestamp": "2025-01-19T15:40:00.000Z"
  }]
}
```

## 実装順序

1. 既存の`DiscordNotifier`クラスに`notifyMemberJoin`メソッドを追加
2. `buildDiscordMemberJoinMessage`メソッドを実装
3. `libs/community/core.js`のFollow関数にDiscord通知処理を追加
4. メンバー数取得処理を実装
5. テスト・デバッグ

## 注意点

- Slack版の`notifyMemberJoin`実装を参考にする
- ルートコミュニティ（parentCid === 0）のチェックが重要
- メンバー数の取得はCommunityMembers.getMembers()を使用
- 非同期処理での適切な例外処理
- 金色（15844367）を使って参加を祝う雰囲気を演出