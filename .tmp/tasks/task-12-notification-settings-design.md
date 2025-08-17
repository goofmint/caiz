# タスク12: 通知設定機能の設計

## 概要

コミュニティオーナーがコミュニティの活動をSlackやDiscordに通知できる機能を設計する。

## 要件

- [x] コミュニティ編集モーダルに通知設定タブを追加

## 機能仕様

### 1. 通知設定UI

コミュニティ編集モーダルに「通知設定」タブを追加し、以下の設定を可能にする：

- Slack通知の有効/無効
- Discord通知の有効/無効
- 通知するイベントの選択（新規トピック、新規投稿、メンバー参加など）

### 2. OAuth認証

#### Slack OAuth
- Slack App設定による認証フロー
- 必要なスコープ：`incoming-webhook`, `channels:read`
- コミュニティごとのチャンネル選択

#### Discord OAuth
- Discord Bot設定による認証フロー
- 必要な権限：`Send Messages`, `View Channels`
- サーバー・チャンネル選択

### 3. 通知設定

- 通知先チャンネルの設定
- 通知フォーマットのカスタマイズ
- 通知頻度の制御（即座/まとめて）

## データベース設計

### community_notifications テーブル
```sql
CREATE TABLE community_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cid INT NOT NULL,
    platform ENUM('slack', 'discord') NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    webhook_url TEXT,
    channel_id VARCHAR(255),
    access_token TEXT,
    events JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cid) REFERENCES categories(cid) ON DELETE CASCADE
);
```

## API設計

### Socket.IO インターフェース

```javascript
// 通知設定の取得
socket.emit('plugins.caiz.getNotificationSettings', { cid }, callback);
// Response: { slack: {}, discord: {} }

// 通知設定の更新
socket.emit('plugins.caiz.updateNotificationSettings', {
    cid,
    platform,
    settings: {
        enabled: boolean,
        webhookUrl?: string,
        channelId?: string,
        events: string[]
    }
}, callback);

// OAuth認証URL取得
socket.emit('plugins.caiz.getOAuthUrl', { cid, platform }, callback);
// Response: { authUrl: string, state: string }

// OAuth認証完了処理
socket.emit('plugins.caiz.completeOAuth', { cid, platform, code, state }, callback);
```

### REST API インターフェース

```javascript
// OAuth認証コールバック
GET /api/v3/plugins/caiz/oauth/:platform/callback?code=...&state=...

// 通知送信テスト
POST /api/v3/plugins/caiz/notifications/test
Body: { cid, platform, message }
```

## フロントエンド設計

### コンポーネント構成

```javascript
// 通知設定タブ
class NotificationSettingsTab {
    constructor(cid) {
        this.cid = cid;
        this.settings = {};
    }
    
    async loadSettings() {
        // 現在の設定を読み込み
    }
    
    async saveSettings() {
        // 設定を保存
    }
    
    async connectSlack() {
        // Slack OAuth認証を開始
    }
    
    async connectDiscord() {
        // Discord OAuth認証を開始
    }
}

// OAuth認証ハンドラー
class OAuthHandler {
    static async handleCallback(platform, code, state) {
        // OAuth認証完了を処理
    }
}
```

### HTML構造

```html
<!-- 通知設定タブ内容 -->
<div class="notification-settings">
    <div class="platform-settings">
        <h4>Slack通知</h4>
        <div class="form-check">
            <input type="checkbox" id="slack-enabled" />
            <label for="slack-enabled">Slack通知を有効にする</label>
        </div>
        <button type="button" class="btn btn-primary" id="connect-slack">
            Slackに接続
        </button>
        <div class="channel-selection" style="display: none;">
            <select id="slack-channel">
                <option value="">チャンネルを選択</option>
            </select>
        </div>
    </div>
    
    <div class="platform-settings">
        <h4>Discord通知</h4>
        <div class="form-check">
            <input type="checkbox" id="discord-enabled" />
            <label for="discord-enabled">Discord通知を有効にする</label>
        </div>
        <button type="button" class="btn btn-primary" id="connect-discord">
            Discordに接続
        </button>
    </div>
    
    <div class="event-settings">
        <h4>通知イベント</h4>
        <div class="form-check">
            <input type="checkbox" id="notify-new-topic" />
            <label for="notify-new-topic">新規トピック作成</label>
        </div>
        <div class="form-check">
            <input type="checkbox" id="notify-new-post" />
            <label for="notify-new-post">新規投稿</label>
        </div>
        <div class="form-check">
            <input type="checkbox" id="notify-member-join" />
            <label for="notify-member-join">メンバー参加</label>
        </div>
    </div>
</div>
```

## バックエンド設計

### 通知管理クラス

```javascript
class NotificationManager {
    constructor() {
        this.platforms = {
            slack: new SlackNotifier(),
            discord: new DiscordNotifier()
        };
    }
    
    async sendNotification(cid, event, data) {
        // 指定されたコミュニティの通知設定を取得し、
        // 有効なプラットフォームに通知を送信
    }
    
    async getSettings(cid) {
        // コミュニティの通知設定を取得
    }
    
    async updateSettings(cid, platform, settings) {
        // 通知設定を更新
    }
}

class SlackNotifier {
    async authenticate(code, state) {
        // Slack OAuth認証を完了
    }
    
    async sendMessage(webhookUrl, message) {
        // Slackにメッセージを送信
    }
    
    async getChannels(accessToken) {
        // アクセス可能なチャンネル一覧を取得
    }
}

class DiscordNotifier {
    async authenticate(code, state) {
        // Discord OAuth認証を完了
    }
    
    async sendMessage(webhookUrl, message) {
        // Discordにメッセージを送信
    }
}
```

### イベントフック

```javascript
// NodeBBのフックを利用して通知を送信
async function onTopicPost(hookData) {
    const { topic, uid } = hookData;
    
    if (topic.cid) {
        const parentCid = await getParentCategory(topic.cid);
        await NotificationManager.sendNotification(parentCid, 'topic:create', {
            topic,
            user: await getUserData(uid)
        });
    }
}

async function onPostCreate(hookData) {
    const { post, uid } = hookData;
    
    if (post.cid) {
        const parentCid = await getParentCategory(post.cid);
        await NotificationManager.sendNotification(parentCid, 'post:create', {
            post,
            user: await getUserData(uid)
        });
    }
}
```

## セキュリティ考慮事項

- OAuth認証のstate parameterによるCSRF対策
- アクセストークンの暗号化保存
- Webhook URLの検証
- レート制限の実装

## 実装フェーズ

1. **Phase 1**: UI設計とモックアップ
2. **Phase 2**: OAuth認証フローの実装
3. **Phase 3**: 通知送信機能の実装
4. **Phase 4**: イベントフックとの統合
5. **Phase 5**: テストとデバッグ