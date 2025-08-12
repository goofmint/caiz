# Task 06g: フラグ付き投稿のレビューUI実装

## 概要

フラグの立った投稿を、コミュニティのマネージャーとオーナーが確認できる専用UIを実装する。投稿内容と同一ユーザーによる過去の拒否履歴を表示する。

## 対象

- [ ] nodebb-plugin-caizにフラグレビュー機能を実装

## 詳細仕様

### 1. 権限管理

```javascript
// libs/permissions.js
module.exports = {
    canViewFlaggedPosts: async function(uid) {
        // オーナーまたはマネージャーかチェック
        // return true if user is owner or manager
    },
    
    canManageFlags: async function(uid) {
        // フラグを承認/却下できるか
        // return true if user has management permissions
    }
};
```

### 2. フラグ付き投稿の取得

```javascript
// libs/flags.js
module.exports = {
    getFlaggedPosts: async function(params) {
        // フラグ付き投稿を取得
        // params: { page, limit, filter }
        // returns: { posts: [], pagination: {} }
    },
    
    getUserFlagHistory: async function(uid) {
        // ユーザーの過去の拒否履歴を取得
        // returns: { rejectedCount, flaggedCount, posts: [] }
    },
    
    resolveFlag: async function(flagId, action, uid) {
        // フラグを解決（承認/却下）
        // action: 'approve' | 'reject' | 'dismiss'
    }
};
```

### 3. フロントエンドルート

```javascript
// routes/index.js
module.exports = function(params, callback) {
    const router = params.router;
    
    // フラグレビューページ
    router.get('/caiz/flags', middleware.buildHeader, renderFlagsPage);
    router.get('/api/caiz/flags', renderFlagsPage);
    
    // API エンドポイント
    router.get('/api/caiz/flags/posts', getFlaggedPosts);
    router.get('/api/caiz/flags/user/:uid', getUserFlagHistory);
    router.post('/api/caiz/flags/:flagId/resolve', resolveFlag);
};
```

### 4. テンプレート構造

```html
<!-- templates/flags.tpl -->
<div class="flags-review-container">
    <div class="row">
        <div class="col-lg-12">
            <h2>[[caiz:flagged-posts-review]]</h2>
            
            <!-- フィルターセクション -->
            <div class="flags-filter">
                <!-- フィルターオプション -->
            </div>
            
            <!-- フラグ付き投稿リスト -->
            <div class="flagged-posts-list">
                <!-- BEGIN flaggedPosts -->
                <div class="flagged-post-item" data-flag-id="{flaggedPosts.flagId}">
                    <div class="post-header">
                        <img src="{flaggedPosts.user.picture}" class="user-avatar">
                        <div class="user-info">
                            <a href="/user/{flaggedPosts.user.userslug}">{flaggedPosts.user.username}</a>
                            <span class="rejection-count">[[caiz:past-rejections]]: {flaggedPosts.user.rejectionCount}</span>
                        </div>
                        <div class="flag-info">
                            <span class="flag-score">[[caiz:ai-score]]: {flaggedPosts.aiScore}</span>
                            <span class="flag-date">{flaggedPosts.flaggedDate}</span>
                        </div>
                    </div>
                    
                    <div class="post-content">
                        {flaggedPosts.content}
                    </div>
                    
                    <div class="post-actions">
                        <button class="btn btn-success approve-flag">[[caiz:approve]]</button>
                        <button class="btn btn-danger reject-flag">[[caiz:reject]]</button>
                        <button class="btn btn-default dismiss-flag">[[caiz:dismiss]]</button>
                    </div>
                </div>
                <!-- END flaggedPosts -->
            </div>
            
            <!-- ページネーション -->
            <div class="pagination-container">
                <!-- pagination component -->
            </div>
        </div>
    </div>
</div>
```

### 5. クライアントサイドJS

```javascript
// static/lib/flags.js
define('forum/caiz/flags', ['api', 'alerts'], function(api, alerts) {
    const Flags = {};
    
    Flags.init = function() {
        // ページ初期化
        // イベントリスナー設定
    };
    
    Flags.loadFlaggedPosts = function(params) {
        // フラグ付き投稿をロード
    };
    
    Flags.loadUserHistory = function(uid) {
        // ユーザー履歴を表示
    };
    
    Flags.resolveFlag = function(flagId, action) {
        // フラグを解決
    };
    
    return Flags;
});
```

### 6. スタイル定義

```css
/* static/style.less */
.flags-review-container {
    .flagged-post-item {
        /* フラグ付き投稿のスタイル */
    }
    
    .rejection-count {
        /* 拒否回数の強調表示 */
    }
    
    .flag-score {
        /* AIスコアの表示 */
    }
}
```

### 7. 言語ファイル

```json
// languages/en-GB/caiz.json
{
    "flagged-posts-review": "Flagged Posts Review",
    "past-rejections": "Past Rejections",
    "ai-score": "AI Score",
    "approve": "Approve",
    "reject": "Reject",
    "dismiss": "Dismiss",
    "flag-resolved": "Flag has been resolved",
    "flag-resolve-error": "Failed to resolve flag"
}
```

## 実装上の注意点

### 権限チェック
- オーナーとマネージャーのみアクセス可能
- 他のユーザーは403エラー

### データ取得
- NodeBBのflagsモジュールと連携
- AI moderationプラグインが追加したメタデータを読み取り

### UI/UX
- レスポンシブデザイン
- リアルタイム更新（WebSocket使用）
- 一括処理機能

### パフォーマンス
- ページネーション実装
- 遅延ローディング
- キャッシュ活用

## 成功条件

- オーナー/マネージャーがフラグ付き投稿を一覧で確認できる
- 各投稿に対してユーザーの過去の拒否回数が表示される
- AIスコアが表示される
- 承認/却下/無視のアクションが実行できる
- レスポンシブで使いやすいUI