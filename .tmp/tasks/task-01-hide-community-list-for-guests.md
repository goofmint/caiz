# タスク01: 未ログインユーザーのコミュニティ一覧非表示機能

## 概要

未ログインのユーザー（ゲストユーザー）がサイトにアクセスした際に、コミュニティサイドバーを非表示にする機能を実装する。

## 要件

- 未ログインユーザーには`nav[component="sidebar-communities"]`要素を表示しない
- ログインユーザーにのみコミュニティサイドバーを表示する
- サイドバーの表示/非表示はサーバーサイドで制御する

## 技術仕様

### 実装場所

1. **テンプレート側の制御**
   - `plugins/nodebb-theme-caiz/templates/partials/sidebar-communities.tpl`
   - テンプレートレベルでログイン状態をチェック

2. **JavaScript側の制御**
   - `plugins/nodebb-plugin-caiz/static/communities.js`
   - `updateCommunities`関数でユーザーログイン状態をチェック

### 実装方法

#### パターン1: テンプレートレベルでの制御（推奨）

```html
{{{ if user.uid }}}
<nav component="sidebar-communities" class="...">
  <!-- サイドバーの内容 -->
</nav>
{{{ end }}}
```

#### パターン2: JavaScript レベルでの制御

```javascript
// communities.js内で早期リターン
if (!app.user || !app.user.uid) {
  console.log('[caiz] User not logged in, skipping community sidebar');
  return;
}
```

### 影響範囲

- **UI/UX**: 未ログインユーザーは左側にコミュニティサイドバーが表示されない
- **レイアウト**: メインコンテンツエリアの幅が調整される可能性
- **パフォーマンス**: 未ログインユーザーはコミュニティ取得APIが呼ばれない

### テスト項目

1. **未ログインユーザー**
   - コミュニティサイドバーが表示されないこと
   - ソケット通信`plugins.caiz.getCommunities`が呼ばれないこと
   - メインコンテンツが正常に表示されること

2. **ログインユーザー**
   - 既存の機能が正常に動作すること
   - コミュニティサイドバーが表示されること
   - フォローしているコミュニティが一覧表示されること

### セキュリティ考慮事項

- 未ログインユーザーがコミュニティAPIにアクセスしても適切にエラーハンドリングされること
- サーバーサイドでも認証チェックが行われること

## 実装優先度

**高**: この機能はユーザビリティとセキュリティの観点から重要