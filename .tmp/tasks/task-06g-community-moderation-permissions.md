# Task 06g: コミュニティ作成時のモデレーション権限自動付与

## 概要

コミュニティ（親カテゴリー）作成時に、owner/managerグループに対して当該コミュニティへのモデレート権限（'read', 'topics:read', 'moderate'）を自動的に付与する機能を実装する。

## 対象

- [ ] コミュニティ作成時の自動権限付与機能の実装

## 詳細仕様

### 1. 権限付与モジュール

```javascript
// plugins/nodebb-plugin-caiz/libs/community/privileges.js
const privileges = require.main.require('./src/privileges');
const groups = require.main.require('./src/groups');

module.exports = {
    grantModerationPrivileges: async function(communityId, groupSlug) {
        // Grant moderation privileges to a group for a community
        // Privileges: ['read', 'topics:read', 'moderate']
    },
    
    setupCommunityPermissions: async function(communityId) {
        // Setup default permissions for a newly created community
        // Grant privileges to owner and manager groups
    },
    
    validateModerationPrivileges: async function(uid, communityId) {
        // Validate if user has moderation privileges in community
        // Check group membership and privileges
    }
};
```

### 2. コミュニティ作成フック

```javascript
// plugins/nodebb-plugin-caiz/libs/community/hooks.js
const privileges = require('./privileges');
const winston = require.main.require('winston');

module.exports = {
    onCommunityCreated: async function(data) {
        const { communityId, ownerUid } = data;
        
        try {
            // Setup moderation permissions for community
            await privileges.setupCommunityPermissions(communityId);
            
            winston.info('[caiz] Moderation privileges granted for community', {
                communityId: communityId,
                ownerUid: ownerUid
            });
        } catch (error) {
            winston.error('[caiz] Failed to setup community permissions', {
                error: error.message,
                communityId: communityId
            });
            throw error;
        }
    }
};
```

### 3. グループ管理統合

```javascript
// plugins/nodebb-plugin-caiz/libs/community/groups.js
const db = require.main.require('./src/database');
const groups = require.main.require('./src/groups');

module.exports = {
    createCommunityGroups: async function(communityId, communityName) {
        // Create owner and manager groups for the community
        const ownerGroupName = `community-${communityId}-owners`;
        const managerGroupName = `community-${communityId}-managers`;
        
        // Implementation creates groups and sets up hierarchy
    },
    
    addUserToGroup: async function(uid, communityId, role) {
        // Add user to community group based on role
        // role: 'owner' | 'manager' | 'member' | 'banned'
    },
    
    getCommunityGroups: async function(communityId) {
        // Get all groups associated with a community
        // Returns: { owners: [], managers: [], members: [], banned: [] }
    }
};
```

### 4. 権限検証ミドルウェア

```javascript
// plugins/nodebb-plugin-caiz/libs/middleware/moderation.js
const privileges = require('../community/privileges');

module.exports = {
    requireModerationPermission: function(req, res, next) {
        const { communityId } = req.params;
        const uid = req.uid;
        
        // Check if user has moderation privileges in the community
        // Return 403 if not authorized
    },
    
    requireCommunityAccess: function(req, res, next) {
        const { communityId } = req.params;
        const uid = req.uid;
        
        // Check if user can access the community
        // Handle private/public community settings
    }
};
```

### 5. データベーススキーマ

```javascript
// Database structure for community privileges
{
    // Community groups mapping
    "community:{communityId}:groups": {
        "owners": "community-{communityId}-owners",
        "managers": "community-{communityId}-managers",
        "members": "community-{communityId}-members",
        "banned": "community-{communityId}-banned"
    },
    
    // Group privileges mapping
    "cid:{communityId}:privileges:groups:{groupName}": [
        "read",
        "topics:read", 
        "moderate"
    ],
    
    // Community settings
    "community:{communityId}:settings": {
        "visibility": "public|private",
        "moderationEnabled": true,
        "autoGrantPrivileges": true
    }
}
```

### 6. API エンドポイント

```javascript
// routes/moderation.js
module.exports = function(params, callback) {
    const router = params.router;
    const middleware = require('../libs/middleware/moderation');
    
    // Get moderation privileges for a community
    router.get('/api/caiz/communities/:communityId/moderation/privileges', 
        middleware.requireModerationPermission, 
        getModerationPrivileges);
    
    // Grant moderation privileges to a user/group
    router.post('/api/caiz/communities/:communityId/moderation/grant',
        middleware.requireModerationPermission,
        grantModerationPrivileges);
    
    // Revoke moderation privileges
    router.delete('/api/caiz/communities/:communityId/moderation/revoke',
        middleware.requireModerationPermission,
        revokeModerationPrivileges);
};
```

### 7. 設定管理

```javascript
// plugins/nodebb-plugin-caiz/libs/community/settings.js
module.exports = {
    getModerationSettings: async function(communityId) {
        // Get moderation settings for a community
        // Returns: { enabled, autoGrant, privileges, groups }
    },
    
    updateModerationSettings: async function(communityId, settings) {
        // Update moderation settings for a community
        // Validate settings and apply changes
    },
    
    getDefaultModerationSettings: function() {
        // Return default moderation settings for new communities
        return {
            enabled: true,
            autoGrant: true,
            privileges: ['read', 'topics:read', 'moderate'],
            groups: ['owners', 'managers']
        };
    }
};
```

### 8. フロントエンド統合

```javascript
// static/lib/community/moderation.js
define('forum/community/moderation', ['api', 'alerts'], function(api, alerts) {
    const Moderation = {};
    
    Moderation.init = function(communityId) {
        // Initialize moderation interface
        // Load current privileges and setup event handlers
    };
    
    Moderation.loadPrivileges = function(communityId) {
        // Load current moderation privileges for the community
    };
    
    Moderation.grantPrivileges = function(communityId, targetUid, privileges) {
        // Grant moderation privileges to a user
    };
    
    Moderation.revokePrivileges = function(communityId, targetUid, privileges) {
        // Revoke moderation privileges from a user
    };
    
    return Moderation;
});
```

## 実装上の注意点

### 権限の階層構造
- **Owner**: 完全な管理権限（メンバー管理、設定変更、削除）
- **Manager**: モデレーション権限（投稿管理、ユーザー警告）
- **Member**: 基本的な参加権限
- **Banned**: アクセス禁止

### セキュリティ考慮事項
- 権限の変更は適切な認証・認可チェック
- 監査ログの記録
- 権限の継承関係の検証

### パフォーマンス考慮事項
- 権限チェックのキャッシュ化
- バッチ処理による効率的な権限付与
- インデックスの最適化

### エラーハンドリング
- 権限付与失敗時のロールバック
- 部分的な失敗の処理
- 詳細なエラーログ

## 成功条件

- コミュニティ作成時に、owner/managerグループが自動作成される
- 作成されたグループに適切なモデレーション権限が付与される
- コミュニティ作成者が自動的にownerグループに追加される
- 権限の変更が適切にログに記録される
- 権限チェックが正常に動作する
- エラー発生時に適切なロールバックが実行される

## テスト要件

### 単体テスト
- 権限付与ロジックのテスト
- 権限検証ロジックのテスト
- エラーハンドリングのテスト

### 統合テスト
- コミュニティ作成フローのテスト
- 権限変更フローのテスト
- 複数コミュニティでの権限分離テスト

### セキュリティテスト
- 権限昇格攻撃の防止テスト
- 不正アクセスの防止テスト
- 権限の適切な継承テスト