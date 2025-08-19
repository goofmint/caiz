# タスク15: Discord OAuth認証

## 概要
Discord OAuth2.0を使用してユーザー認証を行い、Discordアカウントとの連携を実現する。NodeBBのWebSocketを通じて認証フローを実装する。

## 実装範囲
- Discord OAuth2.0認証フローの実装
- アカウント連携・解除機能
- エラーハンドリング

## インターフェース設計

### サーバーサイド

#### WebSocket API

```javascript
// plugins/nodebb-plugin-caiz-notifications/lib/discord/oauth.js

class DiscordOAuth {
  /**
   * Discord OAuth認証URLを生成する
   * @param {Object} params 
   * @param {number} params.uid - ユーザーID
   * @returns {Object} 認証URL情報
   */
  async generateAuthUrl(params) {
    // 実装内容:
    // 1. state tokenを生成してRedisに保存
    // 2. Discord OAuth URLを構築
    // 3. 認証URLとstateを返す
  }

  /**
   * OAuth callbackを処理する
   * @param {Object} params
   * @param {string} params.code - 認証コード
   * @param {string} params.state - 状態トークン
   * @returns {Object} 認証結果
   */
  async handleCallback(params) {
    // 実装内容:
    // 1. state tokenを検証
    // 2. access tokenを取得
    // 3. ユーザー情報を取得
    // 4. トークンを暗号化して保存
  }

  /**
   * Discord接続を解除する
   * @param {Object} params
   * @param {number} params.uid - ユーザーID
   * @returns {boolean} 成功/失敗
   */
  async disconnect(params) {
    // 実装内容:
    // 1. 保存されたトークンを削除
    // 2. Discordでトークンを無効化
    // 3. 関連データをクリーンアップ
  }

  /**
   * 接続状態を確認する
   * @param {Object} params
   * @param {number} params.uid - ユーザーID
   * @returns {Object} 接続ステータス
   */
  async getConnectionStatus(params) {
    // 実装内容:
    // 1. トークンの存在確認
    // 2. トークンの有効性確認
    // 3. ユーザー情報を返す
  }
}
```

#### ルーティング

```javascript
// plugins/nodebb-plugin-caiz-notifications/lib/discord/routes.js

module.exports = function(params, callback) {
  const router = params.router;
  const middleware = params.middleware;

  /**
   * Discord OAuth callbackエンドポイント
   * GET /api/admin/plugins/caiz-notifications/discord/callback
   */
  router.get('/api/admin/plugins/caiz-notifications/discord/callback',
    middleware.applyCSRF,
    async (req, res) => {
      // 実装内容:
      // 1. callbackパラメータを取得
      // 2. WebSocket経由でhandleCallbackを呼び出し
      // 3. 成功時は管理画面にリダイレクト
      // 4. エラー時はエラーページを表示
    }
  );
};
```

### クライアントサイド

```javascript
// public/js/admin/discord-oauth.js

define('admin/plugins/caiz-notifications/discord-oauth', [
  'settings', 'alerts', 'bootbox'
], function(Settings, alerts, bootbox) {
  
  const DiscordOAuth = {
    /**
     * Discord接続を開始する
     */
    connect: function() {
      // 実装内容:
      // 1. generateAuthUrlをWebSocket経由で呼び出し
      // 2. 新しいウィンドウでOAuth URLを開く
      // 3. callback後の処理を設定
    },

    /**
     * Discord接続を解除する
     */
    disconnect: function() {
      // 実装内容:
      // 1. 確認ダイアログを表示
      // 2. disconnectをWebSocket経由で呼び出し
      // 3. UIを更新
    },

    /**
     * 接続状態をチェックして表示を更新する
     */
    updateConnectionStatus: function() {
      // 実装内容:
      // 1. getConnectionStatusを呼び出し
      // 2. 接続/切断ボタンの表示切替
      // 3. ユーザー情報の表示
    }
  };

  return DiscordOAuth;
});
```

## データモデル

### Redis保存構造

```javascript
// 認証状態トークン（一時的）
`discord:oauth:state:{state}` = {
  uid: number,
  timestamp: number,
  expires: number
}

// ユーザーのDiscordトークン（暗号化済み）
`user:{uid}:discord:token` = {
  access_token: string (encrypted),
  refresh_token: string (encrypted),
  expires_at: number,
  scope: string
}

// ユーザーのDiscord情報
`user:{uid}:discord:info` = {
  id: string,
  username: string,
  discriminator: string,
  avatar: string,
  connected_at: number
}
```

## 設定項目

```javascript
// Admin panel settings
{
  "discord_client_id": "Discord Application Client ID",
  "discord_client_secret": "Discord Application Client Secret (encrypted)",
  "discord_redirect_uri": "https://example.com/api/admin/plugins/caiz-notifications/discord/callback",
  "discord_scopes": ["identify", "guilds", "guilds.join"]
}
```

## エラーハンドリング

- 認証エラー: `access_denied`, `invalid_request`, `unauthorized_client`
- ネットワークエラー: タイムアウト、接続エラー
- トークンエラー: 期限切れ、無効なトークン
- 状態エラー: state不一致、期限切れstate

## セキュリティ考慮事項

1. **State検証**: CSRF攻撃を防ぐためstate tokenを使用
2. **スコープ制限**: 必要最小限のスコープのみ要求
3. **HTTPS必須**: callbackは必ずHTTPS経由で受信
4. **トークンの定期更新**: refresh tokenを使用した自動更新

## テスト項目

- [ ] 正常な認証フロー
- [ ] state不一致時のエラー処理
- [ ] トークン期限切れ時の更新
- [ ] 接続解除の動作確認
- [ ] 複数タブでの認証処理
- [ ] ネットワークエラー時の復旧