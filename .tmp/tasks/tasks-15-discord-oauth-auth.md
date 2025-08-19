# タスク15: Discord OAuth認証

## 概要
Discord OAuth2.0を使用してコミュニティとDiscordサーバーの連携を実現する。Slackの実装と同様の構造で、コミュニティ編集機能の一部として実装。

## 実装範囲
- Discord OAuth2.0認証フローの実装
- コミュニティごとの認証トークン保存
- Discord接続・切断機能
- エラーハンドリング

## インターフェース設計

### サーバーサイド

#### OAuth Handler

```javascript
// plugins/nodebb-plugin-caiz/libs/discord-oauth.js

class DiscordOAuth {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.redirectUri = null;
    this.scopes = ['identify', 'guilds', 'webhook.incoming'];
  }

  /**
   * Discord OAuth設定を初期化
   */
  async initialize() {
    // 実装内容:
    // 1. meta.settings.getOneでclientId/clientSecretを取得
    // 2. nconf.get('url')でベースURLを取得
    // 3. リダイレクトURIを構築: {url}/api/v3/plugins/caiz/oauth/discord/callback
  }

  /**
   * 認証URLを生成
   * @param {number} cid - コミュニティID
   * @param {string} state - セキュリティトークン
   * @returns {string} Discord OAuth URL
   */
  generateAuthUrl(cid, state) {
    // 実装内容:
    // 1. Discord OAuth URLを構築
    // 2. client_id, scope, redirect_uri, state, response_typeを含める
    // 3. https://discord.com/oauth2/authorize を使用
  }

  /**
   * セキュリティ用のstateを生成
   * @param {number} cid - コミュニティID
   * @param {number} uid - ユーザーID
   * @returns {string} Base64エンコードされたstate
   */
  generateState(cid, uid) {
    // 実装内容:
    // 1. cid:uid:timestampの形式でデータを作成
    // 2. HMAC-SHA256でハッシュを生成
    // 3. Base64エンコードして返す
  }

  /**
   * stateを検証
   * @param {string} state - 検証するstate
   * @returns {Object|null} 検証成功時はcid/uid、失敗時はnull
   */
  verifyState(state) {
    // 実装内容:
    // 1. Base64デコード
    // 2. HMACハッシュを再計算して検証
    // 3. タイムスタンプの有効期限（1時間）を確認
    // 4. 成功時は{cid, uid, timestamp}を返す
  }

  /**
   * OAuth callbackを処理
   * @param {string} code - 認証コード
   * @param {string} state - stateトークン
   * @returns {Object} 認証結果
   */
  async handleCallback(code, state) {
    // 実装内容:
    // 1. stateを検証してcid/uidを取得
    // 2. exchangeCodeForTokenでアクセストークンを取得
    // 3. getGuildInfoでサーバー情報を取得
    // 4. community-discord-settingsモジュールで保存
    // 5. 成功時は{success, cid, uid, guildName}を返す
  }

  /**
   * 認証コードをアクセストークンに交換
   * @param {string} code - 認証コード
   * @returns {Object} トークン情報
   */
  async exchangeCodeForToken(code) {
    // 実装内容:
    // 1. https://discord.com/api/oauth2/token にPOST
    // 2. client_id, client_secret, code, redirect_uriを送信
    // 3. access_token, refresh_token, webhookを含むレスポンスを返す
  }

  /**
   * Discordサーバー情報を取得
   * @param {string} accessToken - アクセストークン
   * @returns {Object} サーバー情報
   */
  async getGuildInfo(accessToken) {
    // 実装内容:
    // 1. https://discord.com/api/users/@me/guilds にGET
    // 2. Authorizationヘッダーにトークンを設定
    // 3. ユーザーが管理権限を持つサーバー一覧を返す
  }

  /**
   * Discord接続を解除
   * @param {number} cid - コミュニティID
   * @returns {Object} 成功/失敗
   */
  async disconnect(cid) {
    // 実装内容:
    // 1. community-discord-settingsから設定を削除
    // 2. ログ出力
    // 3. {success: true}を返す
  }
}

module.exports = new DiscordOAuth();
```

#### 設定管理

```javascript
// plugins/nodebb-plugin-caiz/libs/community-discord-settings.js

class CommunityDiscordSettings {
  /**
   * Discord設定を保存
   * @param {number} cid - コミュニティID
   * @param {Object} settings - Discord設定
   */
  async saveSettings(cid, settings) {
    // 実装内容:
    // 1. アクセストークンを暗号化
    // 2. db.setObjectでcommunity:{cid}:discord:settingsに保存
    // 3. 保存内容: accessToken, guildId, guildName, userId, connectedAt, webhookUrl
  }

  /**
   * Discord設定を取得
   * @param {number} cid - コミュニティID
   * @returns {Object|null} Discord設定
   */
  async getSettings(cid) {
    // 実装内容:
    // 1. db.getObjectでcommunity:{cid}:discord:settingsから取得
    // 2. アクセストークンを復号化
    // 3. 設定オブジェクトを返す
  }

  /**
   * Discord設定を削除
   * @param {number} cid - コミュニティID
   */
  async deleteSettings(cid) {
    // 実装内容:
    // 1. db.deleteでcommunity:{cid}:discord:settingsを削除
  }
}

module.exports = new CommunityDiscordSettings();
```

#### ルーティング

```javascript
// plugins/nodebb-plugin-caiz/library.js に追加

router.get('/api/v3/plugins/caiz/oauth/discord/callback', async (req, res) => {
  // 実装内容:
  // 1. query parameterからcode, state, errorを取得
  // 2. エラーチェック（error, code/state不足）
  // 3. discordOAuth.initializeを呼び出し
  // 4. discordOAuth.handleCallbackを呼び出し
  // 5. 成功時: /{handle}?discord_success=1&guild={guildName}にリダイレクト
  // 6. 失敗時: /?discord_error={error_type}にリダイレクト
});
```

### クライアントサイド

#### コミュニティ編集モーダルの拡張

```javascript
// public/js/community-edit-modal.js の拡張

// Discord接続ボタンのハンドラー
$('#connect-discord').on('click', function() {
  // 実装内容:
  // 1. socket.emit('plugins.caiz.getDiscordAuthUrl', {cid})を呼び出し
  // 2. 新しいウィンドウでOAuth URLを開く
  // 3. callback後のパラメータをチェック
  // 4. 成功時はUIを更新
});

// Discord切断ボタンのハンドラー
$('#disconnect-discord').on('click', function() {
  // 実装内容:
  // 1. bootbox.confirmで確認ダイアログ表示
  // 2. socket.emit('plugins.caiz.disconnectDiscord', {cid})を呼び出し
  // 3. UIを更新（接続状態の表示切替）
});

// Discord接続状態の確認
function checkDiscordConnection(cid) {
  // 実装内容:
  // 1. socket.emit('plugins.caiz.getDiscordStatus', {cid})を呼び出し
  // 2. 接続済みなら切断ボタンとサーバー名を表示
  // 3. 未接続なら接続ボタンを表示
}
```

### WebSocket API

```javascript
// plugins/nodebb-plugin-caiz/libs/sockets.js の拡張

SocketPlugins.caiz.getDiscordAuthUrl = async function(socket, data) {
  // 実装内容:
  // 1. cidとuidの検証
  // 2. 権限チェック（オーナーまたはマネージャー）
  // 3. discordOAuth.generateStateでstate生成
  // 4. discordOAuth.generateAuthUrlでURL生成
  // 5. {authUrl}を返す
};

SocketPlugins.caiz.disconnectDiscord = async function(socket, data) {
  // 実装内容:
  // 1. cidとuidの検証
  // 2. 権限チェック（オーナーまたはマネージャー）
  // 3. discordOAuth.disconnectを呼び出し
  // 4. 成功/失敗を返す
};

SocketPlugins.caiz.getDiscordStatus = async function(socket, data) {
  // 実装内容:
  // 1. cidの検証
  // 2. communityDiscordSettings.getSettingsで設定取得
  // 3. 接続状態とサーバー情報を返す
};
```

## データモデル

### データベース構造

```javascript
// コミュニティのDiscord設定
`community:{cid}:discord:settings` = {
  accessToken: string (encrypted),
  refreshToken: string (encrypted),
  guildId: string,
  guildName: string,
  userId: string,
  connectedAt: string (ISO date),
  webhookUrl: string,
  webhookId: string,
  webhookToken: string
}
```

## 設定項目

```javascript
// Admin panel settings (plugins/nodebb-plugin-caiz)
{
  "oauth:discord:clientId": "Discord Application Client ID",
  "oauth:discord:clientSecret": "Discord Application Client Secret"
}
```

## エラーハンドリング

- **認証エラー**: `access_denied`, `invalid_request`, `server_error`
- **ネットワークエラー**: 10秒タイムアウト設定
- **state検証エラー**: 不正なstate、期限切れ（1時間）
- **権限エラー**: オーナー/マネージャー以外のアクセス拒否

## セキュリティ考慮事項

1. **トークンの暗号化**: アクセストークンは暗号化して保存（Slack実装と同様）
2. **CSRF対策**: HMAC-SHA256を使用したstate検証
3. **権限制限**: 必要最小限のスコープのみ要求
4. **タイムアウト**: state有効期限1時間、API呼び出し10秒タイムアウト
5. **アクセス制御**: オーナー/マネージャーのみ設定変更可能

## UIデザイン

コミュニティ編集モーダルの「通知」タブに以下を追加：

```html
<div class="discord-settings">
  <h5>Discord連携</h5>
  
  <!-- 未接続時 -->
  <div class="discord-not-connected">
    <p>Discordサーバーと連携していません</p>
    <button id="connect-discord" class="btn btn-primary">
      <i class="fab fa-discord"></i> Discordと連携
    </button>
  </div>
  
  <!-- 接続済み時 -->
  <div class="discord-connected" style="display:none;">
    <p>
      <i class="fab fa-discord"></i> 
      接続済み: <strong class="discord-guild-name"></strong>
    </p>
    <button id="disconnect-discord" class="btn btn-danger">
      連携を解除
    </button>
  </div>
</div>
```

## テスト項目

- [ ] 正常な認証フロー（接続成功）
- [ ] state不一致時のエラー処理
- [ ] アクセス拒否時の処理
- [ ] 接続解除の動作確認
- [ ] 権限チェック（非オーナー/マネージャーのアクセス拒否）
- [ ] タイムアウト処理（API呼び出し、state有効期限）