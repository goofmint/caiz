# タスク13: Slack/Discord OAuth設定の管理画面設計

## 概要

NodeBB管理画面でSlack AppとDiscord Botの認証情報を設定できる機能を設計する。これにより、各コミュニティがSlack/Discord通知を利用できるようになる。

## 要件

- [ ] Slack、Discordアプリに必要な設定を管理画面で行えるようにする

## 機能仕様

### 1. 管理画面の設定ページ

NodeBB管理画面の「Plugins」→「Caiz」セクションに、OAuth設定タブを追加：

- Slack App設定
  - Client ID
  - Client Secret  
  - Signing Secret
  - リダイレクトURL（表示のみ）
- Discord Bot設定
  - Client ID
  - Client Secret
  - Bot Token
  - リダイレクトURL（表示のみ）

### 2. 設定の保存と暗号化

- 機密情報（Secret、Token）は暗号化して保存
- 設定変更時の検証機能
- テスト接続機能

## データベース設計

NodeBBの設定保存機能を利用：

```javascript
// 設定キー構造
{
  "plugin:caiz:oauth:slack:clientId": "string",
  "plugin:caiz:oauth:slack:clientSecret": "encrypted_string",
  "plugin:caiz:oauth:slack:signingSecret": "encrypted_string",
  "plugin:caiz:oauth:discord:clientId": "string",
  "plugin:caiz:oauth:discord:clientSecret": "encrypted_string",
  "plugin:caiz:oauth:discord:botToken": "encrypted_string"
}
```

## API設計

### 管理者用Socket.IO インターフェース

```javascript
// OAuth設定の取得（管理者のみ）
socket.emit('admin.plugins.caiz.getOAuthSettings', callback);
// Response: { slack: { clientId, hasSecret }, discord: { clientId, hasToken } }

// OAuth設定の保存（管理者のみ）
socket.emit('admin.plugins.caiz.saveOAuthSettings', {
  platform: 'slack' | 'discord',
  settings: {
    clientId: string,
    clientSecret?: string,
    signingSecret?: string,  // Slackのみ
    botToken?: string        // Discordのみ
  }
}, callback);

// 接続テスト（管理者のみ）
socket.emit('admin.plugins.caiz.testOAuthConnection', {
  platform: 'slack' | 'discord'
}, callback);
// Response: { success: boolean, message?: string }
```

### 管理画面ルート

```javascript
// 管理画面のページルート
GET /admin/plugins/caiz/oauth
```

## フロントエンド設計

### 管理画面テンプレート

```html
<!-- templates/admin/plugins/caiz-oauth.tpl -->
<div class="acp-page-container">
  <div class="row">
    <div class="col-lg-9">
      <div class="panel panel-default">
        <div class="panel-heading">OAuth設定</div>
        <div class="panel-body">
          <ul class="nav nav-tabs" role="tablist">
            <li role="presentation" class="active">
              <a href="#slack-settings" data-toggle="tab">Slack</a>
            </li>
            <li role="presentation">
              <a href="#discord-settings" data-toggle="tab">Discord</a>
            </li>
          </ul>
          
          <div class="tab-content">
            <!-- Slack設定タブ -->
            <div role="tabpanel" class="tab-pane active" id="slack-settings">
              <form id="slack-oauth-form">
                <div class="form-group">
                  <label for="slack-client-id">Client ID</label>
                  <input type="text" id="slack-client-id" class="form-control" />
                </div>
                <div class="form-group">
                  <label for="slack-client-secret">Client Secret</label>
                  <input type="password" id="slack-client-secret" class="form-control" />
                  <p class="help-block">変更する場合のみ入力</p>
                </div>
                <div class="form-group">
                  <label for="slack-signing-secret">Signing Secret</label>
                  <input type="password" id="slack-signing-secret" class="form-control" />
                </div>
                <div class="form-group">
                  <label>リダイレクトURL</label>
                  <input type="text" class="form-control" readonly 
                         value="{config.url}/api/v3/plugins/caiz/oauth/slack/callback" />
                  <p class="help-block">Slack Appの設定でこのURLを追加してください</p>
                </div>
                <button type="submit" class="btn btn-primary">保存</button>
                <button type="button" class="btn btn-default" id="test-slack">接続テスト</button>
              </form>
            </div>
            
            <!-- Discord設定タブ -->
            <div role="tabpanel" class="tab-pane" id="discord-settings">
              <form id="discord-oauth-form">
                <div class="form-group">
                  <label for="discord-client-id">Client ID</label>
                  <input type="text" id="discord-client-id" class="form-control" />
                </div>
                <div class="form-group">
                  <label for="discord-client-secret">Client Secret</label>
                  <input type="password" id="discord-client-secret" class="form-control" />
                  <p class="help-block">変更する場合のみ入力</p>
                </div>
                <div class="form-group">
                  <label for="discord-bot-token">Bot Token</label>
                  <input type="password" id="discord-bot-token" class="form-control" />
                </div>
                <div class="form-group">
                  <label>リダイレクトURL</label>
                  <input type="text" class="form-control" readonly 
                         value="{config.url}/api/v3/plugins/caiz/oauth/discord/callback" />
                  <p class="help-block">Discord Appの設定でこのURLを追加してください</p>
                </div>
                <button type="submit" class="btn btn-primary">保存</button>
                <button type="button" class="btn btn-default" id="test-discord">接続テスト</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="col-lg-3">
      <div class="panel panel-default">
        <div class="panel-heading">設定ガイド</div>
        <div class="panel-body">
          <h5>Slack App作成手順</h5>
          <ol>
            <li><a href="https://api.slack.com/apps" target="_blank">Slack API</a>にアクセス</li>
            <li>「Create New App」をクリック</li>
            <li>OAuth & Permissionsで必要なスコープを追加</li>
            <li>リダイレクトURLを設定</li>
          </ol>
          
          <h5>Discord Bot作成手順</h5>
          <ol>
            <li><a href="https://discord.com/developers/applications" target="_blank">Discord Developer Portal</a>にアクセス</li>
            <li>「New Application」をクリック</li>
            <li>Botセクションでトークンを取得</li>
            <li>OAuth2でリダイレクトURLを設定</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 管理画面JavaScript

```javascript
// static/lib/admin/plugins/caiz-oauth.js
define('admin/plugins/caiz-oauth', ['settings', 'alerts'], function (Settings, alerts) {
    const OAuthAdmin = {};
    
    OAuthAdmin.init = function () {
        // 設定の読み込み
        loadSettings();
        
        // イベントリスナーの設定
        $('#slack-oauth-form').on('submit', handleSlackSubmit);
        $('#discord-oauth-form').on('submit', handleDiscordSubmit);
        $('#test-slack').on('click', testSlackConnection);
        $('#test-discord').on('click', testDiscordConnection);
    };
    
    function loadSettings() {
        // Socket.IOで設定を取得
    }
    
    function handleSlackSubmit(e) {
        // Slack設定の保存
    }
    
    function handleDiscordSubmit(e) {
        // Discord設定の保存
    }
    
    function testSlackConnection() {
        // Slack接続テスト
    }
    
    function testDiscordConnection() {
        // Discord接続テスト
    }
    
    return OAuthAdmin;
});
```

## バックエンド設計

### 設定管理クラス

```javascript
// libs/oauth-settings.js
class OAuthSettings {
    constructor() {
        this.meta = require.main.require('./src/meta');
        this.db = require.main.require('./src/database');
    }
    
    async getSettings(platform) {
        // 設定を取得（Secretは隠蔽）
    }
    
    async saveSettings(platform, settings) {
        // 設定を暗号化して保存
    }
    
    async testConnection(platform) {
        // 接続テストを実行
    }
    
    async encryptSecret(secret) {
        // 機密情報を暗号化
    }
    
    async decryptSecret(encrypted) {
        // 機密情報を復号化
    }
}

module.exports = OAuthSettings;
```

### 管理画面ルート設定

```javascript
// library.js - addAdminNavigation
plugin.addAdminNavigation = function (header, callback) {
    header.plugins.push({
        route: '/plugins/caiz/oauth',
        icon: 'fa-key',
        name: 'Caiz OAuth Settings'
    });
    
    callback(null, header);
};

// library.js - defineRoutes
plugin.defineRoutes = function (data, callback) {
    data.router.get('/admin/plugins/caiz/oauth', data.middleware.admin.buildHeader, renderOAuthAdmin);
    data.router.get('/api/admin/plugins/caiz/oauth', renderOAuthAdmin);
    
    callback(null, data);
};
```

## セキュリティ考慮事項

- Client SecretとBot Tokenは必ず暗号化して保存
- 管理者権限のチェックを厳格に実施
- 設定変更時の監査ログ記録
- リダイレクトURLの検証
- レート制限の実装

## 設定手順ドキュメント

### Slack App設定

1. https://api.slack.com/apps にアクセス
2. 「Create New App」→「From scratch」を選択
3. App Nameとワークスペースを設定
4. OAuth & Permissionsセクションで：
   - Redirect URLsに管理画面に表示されたURLを追加
   - Bot Token Scopesに以下を追加：
     - `chat:write`
     - `channels:read`
     - `incoming-webhook`
5. Basic InformationセクションからClient ID、Client Secret、Signing Secretを取得

### Discord Bot設定

1. https://discord.com/developers/applications にアクセス
2. 「New Application」をクリック
3. General InformationからClient IDを取得
4. OAuth2セクションで：
   - Client Secretを取得
   - Redirectsに管理画面に表示されたURLを追加
5. Botセクションで：
   - 「Add Bot」をクリック
   - Tokenを取得
   - 必要な権限を設定

## テスト項目

- [ ] 管理画面へのアクセス権限確認
- [ ] 設定の保存と読み込み
- [ ] 機密情報の暗号化確認
- [ ] 接続テスト機能の動作確認
- [ ] エラーハンドリング