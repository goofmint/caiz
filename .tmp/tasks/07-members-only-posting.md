# タスク07: メンバーしか書き込み不可

## 概要
コミュニティ内での投稿権限をメンバーのみに制限する機能を実装する。
コミュニティメンバー以外のユーザーは、トピックやコメントを閲覧できるが投稿はできない。

## 要件定義

### 機能要件
1. **権限の階層**
   - オーナー: すべての権限
   - マネージャー: 投稿・編集・削除権限
   - メンバー: 投稿権限
   - 非メンバー（ログインユーザー）: 閲覧のみ
   - ゲスト: 閲覧のみ

2. **適用範囲**
   - コミュニティ（親カテゴリー）配下のすべてのサブカテゴリーに適用
   - 新規トピック作成の制限
   - 既存トピックへの返信の制限

3. **UI表示**
   - 非メンバーには投稿ボタンを無効化またはメッセージ表示
   - 「メンバーになる」へのナビゲーション

### 非機能要件
- 既存のNodeBB権限システムとの互換性維持
- パフォーマンスへの影響を最小限に

## 実装設計

### 1. 権限チェックシステム

```javascript
// plugins/nodebb-plugin-caiz/libs/community/permissions.js

/**
 * ユーザーがコミュニティメンバーかチェック
 * @param {number} uid - ユーザーID
 * @param {number} cid - カテゴリID
 * @returns {Promise<boolean>} メンバーである場合true
 */
async function isCommunityMember(uid, cid) {
  // 実装:
  // 1. カテゴリの親コミュニティを取得
  // 2. ユーザーがオーナー/マネージャー/メンバーグループに所属しているかチェック
  // 3. バンされていないかチェック
}

/**
 * ユーザーが投稿権限を持つかチェック
 * @param {number} uid - ユーザーID
 * @param {number} cid - カテゴリID
 * @returns {Promise<boolean>} 投稿権限がある場合true
 */
async function canPost(uid, cid) {
  // 実装:
  // 1. isCommunityMemberをチェック
  // 2. カテゴリ固有の権限設定を確認
  // 3. 総合的な判定を返す
}
```

### 2. フィルターフック

```javascript
// plugins/nodebb-plugin-caiz/libs/hooks/posting.js

/**
 * トピック作成前のフィルター
 * filter:topics.create
 */
async function filterTopicCreate(hookData) {
  // 実装:
  // 1. ユーザーの投稿権限をチェック
  // 2. 権限がない場合はエラーをthrow
  // 3. 権限がある場合はhookDataをそのまま返す
}

/**
 * 返信作成前のフィルター
 * filter:posts.create
 */
async function filterPostCreate(hookData) {
  // 実装:
  // 1. トピックの所属カテゴリを取得
  // 2. ユーザーの投稿権限をチェック
  // 3. 適切な処理を実行
}
```

### 3. クライアントサイドUI制御

```javascript
// plugins/nodebb-plugin-caiz/static/posting-control.js

/**
 * 投稿UIの表示制御
 */
class PostingControl {
  /**
   * ページロード時の初期化
   */
  static init() {
    // 実装:
    // 1. 現在のユーザーの権限を取得
    // 2. UIコンポーネントの表示/非表示を制御
    // 3. イベントリスナーの登録
  }

  /**
   * 投稿ボタンの制御
   * @param {boolean} canPost - 投稿可能かどうか
   */
  static updatePostButton(canPost) {
    // 実装:
    // 1. 投稿ボタンの有効/無効を切り替え
    // 2. ツールチップやメッセージの表示
    // 3. 代替アクション（メンバー登録へのリンク等）の表示
  }
}
```

### 4. ソケットAPI

```javascript
// plugins/nodebb-plugin-caiz/libs/sockets/permissions.js

/**
 * ユーザーの投稿権限を取得
 */
sockets.caiz.checkPostingPermission = async function(socket, data) {
  // 実装:
  // 1. ユーザーIDとカテゴリIDから権限をチェック
  // 2. 結果を返す
  // 3. エラーハンドリング
};
```

## プラグイン設定の更新

```json
// plugins/nodebb-plugin-caiz/plugin.json
{
  "hooks": [
    {
      "hook": "filter:topics.create",
      "method": "hooks.filterTopicCreate"
    },
    {
      "hook": "filter:posts.create",
      "method": "hooks.filterPostCreate"
    },
    {
      "hook": "filter:privileges.categories.get",
      "method": "hooks.filterCategoryPrivileges"
    }
  ],
  "scripts": [
    "static/posting-control.js"
  ]
}
```

## テスト項目

1. **権限チェック**
   - [ ] オーナーが投稿できることを確認
   - [ ] マネージャーが投稿できることを確認
   - [ ] メンバーが投稿できることを確認
   - [ ] 非メンバーが投稿できないことを確認
   - [ ] ゲストが投稿できないことを確認

2. **UI表示**
   - [ ] 非メンバーに適切なメッセージが表示される
   - [ ] 投稿ボタンが適切に制御される
   - [ ] メンバー登録へのナビゲーションが機能する

3. **パフォーマンス**
   - [ ] 権限チェックが高速に動作する
   - [ ] キャッシュが適切に機能する

## 注意事項

- NodeBBの標準権限システムとの競合を避ける
- 既存のコミュニティ機能との整合性を保つ
- ユーザー体験を損なわないようにエラーメッセージを工夫する