# タスク14: Slack OAuth認証機能の設計

## 概要

コミュニティオーナーが各コミュニティでSlackワークスペースとの連携を設定できるOAuth認証機能を設計する。

## 要件

- [ ] SlackのOAuth認証

## 機能仕様

### 1. OAuth認証フロー

コミュニティ編集モーダルの通知設定タブでSlackへの接続ボタンを押すと：

1. **認証開始**
   - Slack OAuth認証URLにリダイレクト
   - 必要なスコープを含めた認証要求
   - stateパラメータでコミュニティIDとセキュリティ確認

2. **ユーザー認証**
   - Slackのワークスペース選択
   - 権限許可の確認
   - チャンネル選択権限の付与

3. **認証完了**
   - コールバックURLで認証コードを受信
   - アクセストークンとワークスペース情報を取得
   - コミュニティごとの設定として保存

### 2. 必要なSlackスコープ

- `channels:read` - チャンネル一覧の取得
- `chat:write` - メッセージの送信
- `incoming-webhook` - Webhook URL の取得

### 3. 認証状態管理

- コミュニティごとのワークスペース連携状態
- アクセストークンの安全な保存
- Webhook URLの自動取得

## データベース設計

### community_slack_settings テーブル

```sql
-- NodeBBの設定システムを使用
-- キー形式: community:slack:{cid}:*
{
  "community:slack:{cid}:accessToken": "encrypted_token",
  "community:slack:{cid}:teamId": "team_id",
  "community:slack:{cid}:teamName": "team_name",
  "community:slack:{cid}:channelId": "channel_id",
  "community:slack:{cid}:channelName": "channel_name",
  "community:slack:{cid}:webhookUrl": "encrypted_url",
  "community:slack:{cid}:userId": "user_id",
  "community:slack:{cid}:connectedAt": "timestamp"
}
```

## API設計

### Socket.IO インターフェース

```javascript
// Slack OAuth認証URL取得
socket.emit('plugins.caiz.getSlackAuthUrl', { cid }, callback);
// Response: { authUrl: string, state: string }

// Slack認証状態取得
socket.emit('plugins.caiz.getSlackConnectionStatus', { cid }, callback);
// Response: { 
//   connected: boolean, 
//   teamName?: string, 
//   channelName?: string,
//   connectedAt?: string
// }

// Slack接続解除
socket.emit('plugins.caiz.disconnectSlack', { cid }, callback);
// Response: { success: boolean }

// Slackチャンネル一覧取得
socket.emit('plugins.caiz.getSlackChannels', { cid }, callback);
// Response: { channels: Array<{id, name}> }

// Slack通知チャンネル設定
socket.emit('plugins.caiz.setSlackChannel', { cid, channelId }, callback);
// Response: { success: boolean }
```

### REST API インターフェース

```javascript
// OAuth認証開始
GET /api/v3/plugins/caiz/oauth/slack/auth?cid={cid}
// Redirect to Slack OAuth URL

// OAuth認証コールバック
GET /api/v3/plugins/caiz/oauth/slack/callback?code={code}&state={state}
// Process OAuth callback and redirect back to community edit modal
```

## フロントエンド設計

### コミュニティ編集モーダルの通知設定タブ更新

```html
<!-- Slack接続セクションの更新 -->
<div class="card mb-3">
  <div class="card-body">
    <h5 class="card-title">
      <i class="fab fa-slack me-2"></i>[[caiz:slack-notifications]]
    </h5>
    
    <!-- 未接続状態 -->
    <div id="slack-disconnected" style="display: none;">
      <p class="text-muted">[[caiz:slack-not-connected]]</p>
      <button type="button" class="btn btn-primary" id="connect-slack">
        <i class="fab fa-slack me-1"></i>[[caiz:connect-to-slack]]
      </button>
    </div>
    
    <!-- 接続済み状態 -->
    <div id="slack-connected" style="display: none;">
      <div class="alert alert-success">
        <i class="fa fa-check-circle me-1"></i>
        [[caiz:slack-connected-to]] <strong id="slack-team-name"></strong>
        <br>
        <small class="text-muted">[[caiz:connected-at]] <span id="slack-connected-date"></span></small>
      </div>
      
      <div class="form-group">
        <label for="slack-channel">[[caiz:notification-channel]]</label>
        <select class="form-select" id="slack-channel">
          <option value="">[[caiz:loading-channels]]</option>
        </select>
      </div>
      
      <div class="form-check mb-3">
        <input type="checkbox" class="form-check-input" id="slack-enabled">
        <label class="form-check-label" for="slack-enabled">
          [[caiz:enable-slack-notifications]]
        </label>
      </div>
      
      <button type="button" class="btn btn-outline-danger" id="disconnect-slack">
        <i class="fa fa-unlink me-1"></i>[[caiz:disconnect-slack]]
      </button>
    </div>
  </div>
</div>
```

### JavaScript処理

```javascript
// Slack接続管理クラス
class SlackConnectionManager {
    constructor(cid) {
        this.cid = cid;
        this.init();
    }
    
    async init() {
        // 接続状態をチェック
        await this.checkConnectionStatus();
        
        // イベントリスナー設定
        this.setupEventListeners();
    }
    
    async checkConnectionStatus() {
        // Socket.IOで接続状態を取得
        // UIの表示を切り替え
    }
    
    async connectToSlack() {
        // OAuth認証URLを取得してリダイレクト
    }
    
    async disconnectFromSlack() {
        // Slack接続を解除
    }
    
    async loadChannels() {
        // Slackチャンネル一覧を取得
    }
    
    async setNotificationChannel(channelId) {
        // 通知先チャンネルを設定
    }
    
    setupEventListeners() {
        // 各ボタンのイベントリスナーを設定
    }
}
```

## バックエンド設計

### Slack OAuth管理クラス

```javascript
// libs/slack-oauth.js
class SlackOAuth {
    constructor() {
        this.clientId = null;
        this.clientSecret = null;
        this.redirectUri = null;
    }
    
    async initialize() {
        // 管理画面で設定されたOAuth情報を取得
    }
    
    generateAuthUrl(cid, state) {
        // Slack OAuth認証URLを生成
        // 必要なスコープを含める
    }
    
    async handleCallback(code, state) {
        // OAuth認証コールバックを処理
        // アクセストークンを取得
        // ワークスペース情報を取得
        // データベースに保存
    }
    
    async getAccessToken(cid) {
        // コミュニティのSlackアクセストークンを取得
    }
    
    async getChannels(cid) {
        // Slackチャンネル一覧を取得
    }
    
    async testConnection(cid) {
        // Slack接続をテスト
    }
    
    async disconnect(cid) {
        // Slack接続を解除
        // 保存されたデータを削除
    }
}

module.exports = SlackOAuth;
```

### OAuth設定管理

```javascript
// libs/community-slack-settings.js
class CommunitySlackSettings {
    async getSettings(cid) {
        // コミュニティのSlack設定を取得
    }
    
    async saveSettings(cid, settings) {
        // Slack設定を保存（暗号化）
    }
    
    async deleteSettings(cid) {
        // Slack設定を削除
    }
    
    async isConnected(cid) {
        // Slack接続状態を確認
    }
    
    async getConnectionInfo(cid) {
        // 接続情報（チーム名、チャンネル等）を取得
    }
}
```

### ルート処理

```javascript
// OAuth認証開始ルート
async function startSlackAuth(req, res) {
    const { cid } = req.query;
    
    // 権限チェック
    // OAuth URLを生成
    // リダイレクト
}

// OAuth認証コールバックルート
async function handleSlackCallback(req, res) {
    const { code, state } = req.query;
    
    // stateパラメータを検証
    // OAuth処理を実行
    // 成功/失敗メッセージと共にリダイレクト
}
```

## セキュリティ考慮事項

- stateパラメータによるCSRF攻撃対策
- アクセストークンの暗号化保存
- OAuth認証のタイムアウト処理
- 不正なコールバック要求の検証
- コミュニティオーナー権限の確認

## エラーハンドリング

- OAuth認証の拒否
- 無効なstateパラメータ
- アクセストークン取得失敗
- ネットワークエラー
- 権限不足エラー

## ユーザーエクスペリエンス

1. **分かりやすい接続フロー**
   - 接続状態の明確な表示
   - 進行状況の可視化

2. **エラー時の適切なフィードバック**
   - 具体的なエラーメッセージ
   - 再試行の案内

3. **接続管理の簡便性**
   - ワンクリックでの接続/切断
   - チャンネル選択の簡単操作