# タスク3: ユーザー認証フロー実装

## 概要
OAuth2 Device Authorization Grantにおけるユーザー認証フローの実装。ユーザーがブラウザでユーザーコードを入力し、デバイス認証を承認または拒否する画面とロジックを提供する。

## 実装対象

### 1. デバイス認証画面

#### GET /oauth/device
ユーザーコード入力画面を表示する。

```javascript
// routes/oauth.js (追加)
/**
 * Device Authorization User Interface
 * RFC 8628 Section 3.3
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function showDeviceAuthPage(req, res) {
    // Implementation:
    // 1. Check if user is logged in (NodeBB authentication)
    // 2. Extract user_code from query parameter (optional)
    // 3. Validate user_code if provided
    // 4. Render device authentication template
    // 5. Handle error cases (invalid/expired codes)
}

router.get('/oauth/device', middleware.ensureLoggedIn, showDeviceAuthPage);
```

#### POST /oauth/device
ユーザーの承認・拒否処理を実行する。

```javascript
// routes/oauth.js (追加)
/**
 * Device Authorization Form Submit
 * Handle user approval/denial
 * 
 * @param {Object} req - Express request  
 * @param {Object} res - Express response
 */
async function handleDeviceAuth(req, res) {
    // Implementation:
    // 1. Validate user_code from form
    // 2. Retrieve device authorization request
    // 3. Check user permissions and authentication
    // 4. Update authorization status (approved/denied)
    // 5. Store user_id for approved requests
    // 6. Display success/error message
}

router.post('/oauth/device', middleware.ensureLoggedIn, handleDeviceAuth);
```

### 2. テンプレートファイル

#### templates/oauth-device.tpl
デバイス認証画面のHTMLテンプレート。

```html
<!-- OAuth Device Authorization Page -->
<div class="device-auth-container">
    <div class="card">
        <div class="card-header">
            <h3>[[caiz:oauth.device.title]]</h3>
        </div>
        
        <div class="card-body">
            <!-- IF !user_code -->
            <!-- User code input form -->
            <form method="post" action="/oauth/device">
                <div class="form-group">
                    <label for="user_code">[[caiz:oauth.device.user-code-label]]</label>
                    <input type="text" class="form-control" id="user_code" name="user_code" 
                           placeholder="XXXX-XXXX" pattern="[A-Z0-9]{4}-[A-Z0-9]{4}" required>
                    <small class="form-text">[[caiz:oauth.device.user-code-help]]</small>
                </div>
                
                <button type="submit" class="btn btn-primary">[[caiz:oauth.device.continue]]</button>
            </form>
            <!-- ENDIF -->
            
            <!-- IF user_code -->
            <!-- Authorization confirmation -->
            <div class="auth-request-details">
                <h4>[[caiz:oauth.device.confirm-title]]</h4>
                <div class="device-info">
                    <p><strong>[[caiz:oauth.device.user-code]]:</strong> {user_code}</p>
                    <p><strong>[[caiz:oauth.device.client]]:</strong> {client_name}</p>
                    <p><strong>[[caiz:oauth.device.scopes]]:</strong></p>
                    <ul class="scope-list">
                        <!-- BEGIN scopes -->
                        <li>{scopes.description}</li>
                        <!-- END scopes -->
                    </ul>
                    <p><strong>[[caiz:oauth.device.expires]]:</strong> {expires_at}</p>
                </div>
                
                <form method="post" action="/oauth/device">
                    <input type="hidden" name="user_code" value="{user_code}">
                    <div class="button-group">
                        <button type="submit" name="action" value="approve" 
                                class="btn btn-success">[[caiz:oauth.device.approve]]</button>
                        <button type="submit" name="action" value="deny" 
                                class="btn btn-danger">[[caiz:oauth.device.deny]]</button>
                    </div>
                </form>
            </div>
            <!-- ENDIF -->
        </div>
    </div>
</div>
```

### 3. クライアントサイドスクリプト

#### public/oauth-device.js
ユーザーコード入力の補助機能とバリデーション。

```javascript
'use strict';

define('oauth-device', function() {
    const OAuthDevice = {};

    /**
     * Initialize device authorization page
     */
    OAuthDevice.init = function() {
        // Format user code input (add hyphen automatically)
        // Validate code format on input
        // Handle form submission
        // Show loading states
    };

    /**
     * Format user code with hyphen
     * @param {string} code - Raw user input
     * @returns {string} Formatted code (XXXX-XXXX)
     */
    OAuthDevice.formatUserCode = function(code) {
        // Remove non-alphanumeric characters and convert to uppercase
        // Insert hyphen after 4 characters
        // Limit to 8 characters total
    };

    /**
     * Validate user code format
     * @param {string} code - User code to validate
     * @returns {boolean} Whether code format is valid
     */
    OAuthDevice.validateUserCode = function(code) {
        // Check format: XXXX-XXXX
        // Validate character set (no ambiguous chars)
        // Return validation result
    };

    /**
     * Handle countdown timer for code expiration
     * @param {number} expiresAt - Expiration timestamp
     */
    OAuthDevice.startCountdown = function(expiresAt) {
        // Display countdown timer
        // Update every second
        // Show expiration warning
        // Disable form when expired
    };

    return OAuthDevice;
});
```

### 4. 多言語対応

#### language/ja.json (追加項目)
```json
{
    "oauth": {
        "device": {
            "title": "デバイス認証",
            "user-code-label": "ユーザーコード",
            "user-code-help": "デバイスに表示された8文字のコードを入力してください",
            "continue": "続行",
            "confirm-title": "認証の確認",
            "user-code": "ユーザーコード",
            "client": "アプリケーション",
            "scopes": "要求された権限",
            "expires": "有効期限",
            "approve": "承認する",
            "deny": "拒否する",
            "success-approved": "デバイスの認証が完了しました",
            "success-denied": "デバイスの認証を拒否しました",
            "error-invalid-code": "無効なユーザーコードです",
            "error-expired-code": "ユーザーコードの有効期限が切れています",
            "error-not-found": "ユーザーコードが見つかりません"
        }
    }
}
```

#### language/en-US.json (追加項目)
```json
{
    "oauth": {
        "device": {
            "title": "Device Authorization",
            "user-code-label": "User Code",
            "user-code-help": "Enter the 8-character code displayed on your device",
            "continue": "Continue",
            "confirm-title": "Confirm Authorization",
            "user-code": "User Code",
            "client": "Application",
            "scopes": "Requested Permissions",
            "expires": "Expires",
            "approve": "Approve",
            "deny": "Deny",
            "success-approved": "Device authorization completed successfully",
            "success-denied": "Device authorization was denied",
            "error-invalid-code": "Invalid user code",
            "error-expired-code": "User code has expired",
            "error-not-found": "User code not found"
        }
    }
}
```

### 5. スコープ表示

#### スコープ説明マッピング
```javascript
const SCOPE_DESCRIPTIONS = {
    'mcp:read': {
        ja: 'プロファイル情報の読み取り',
        'en-US': 'Read profile information'
    },
    'mcp:search': {
        ja: 'コンテンツの検索',
        'en-US': 'Search content'
    },
    'mcp:write': {
        ja: 'コンテンツの書き込み',
        'en-US': 'Write content'
    },
    'openid': {
        ja: 'OpenID Connect認証',
        'en-US': 'OpenID Connect authentication'
    }
};
```

### 6. ルート統合

#### library.js (ルート追加)
```javascript
// Device authorization routes setup
// GET /oauth/device - Show device auth page
// POST /oauth/device - Handle user approval/denial
```

## セキュリティ考慮事項

### 1. ユーザーコード保護
- CSRF保護の実装
- ユーザーコードの大文字小文字正規化
- 不正なコード形式の早期バリデーション

### 2. セッション管理
- NodeBBの標準ログイン機能との統合
- セッションタイムアウトの適切な処理
- ログイン後のリダイレクト処理

### 3. 期限切れ処理
- リアルタイムでの期限切れ検証
- クライアントサイドでのカウントダウン表示
- 期限切れ時の適切なエラーメッセージ

## ユーザー体験

### 1. 通常フロー
1. ユーザーがブラウザで `/oauth/device` にアクセス
2. NodeBBにログインしていない場合はログイン画面にリダイレクト
3. ログイン後、ユーザーコード入力画面を表示
4. ユーザーがデバイスに表示されたコードを入力
5. 承認確認画面でアプリケーション情報と権限を表示
6. ユーザーが承認または拒否を選択
7. 結果画面を表示

### 2. 短縮フロー (verification_uri_complete)
1. ユーザーが `/oauth/device?user_code=XXXX-XXXX` に直接アクセス
2. ログイン確認後、承認確認画面を直接表示
3. ユーザーが承認または拒否を選択
4. 結果画面を表示

## テスト要件

1. 正常なユーザーコード入力と承認
2. 無効なユーザーコードの処理
3. 期限切れコードの処理
4. 未ログインユーザーのリダイレクト
5. CSRF攻撃に対する保護
6. クライアントサイドバリデーション
7. レスポンシブデザインの動作確認