# Task 03c: コミュニティメンバーのロール管理機能

## タスク概要
コミュニティ内のメンバーのロール管理（オーナー、マネージャー、メンバー、バン）を行う機能を実装する。

## 実装範囲
- [ ] コミュニティ編集モーダルの「Members」タブの機能実装
- [ ] メンバー一覧の表示
- [ ] メンバーの検索・追加機能
- [ ] メンバーロールの変更機能
- [ ] メンバーの削除・バン機能

## ロール体系

### オーナー (Owner)
- コミュニティの最高権限者
- 全ての機能にアクセス可能
- 他のオーナーの指定が可能
- コミュニティの削除が可能

### マネージャー (Manager)
- コミュニティの管理者
- カテゴリーの追加・編集・削除
- メンバーの管理（バンを除く）
- コンテンツのモデレーション

### メンバー (Member)
- コミュニティの一般参加者
- 投稿・コメントの作成
- トピックの作成と参加

### バン (Banned)
- コミュニティから除外されたユーザー
- コミュニティへのアクセス制限
- 投稿・コメント禁止

## 技術仕様

### UI設計
- コミュニティ編集モーダルの既存「Members」タブを活用
- メンバー一覧をテーブルまたはカード形式で表示
- ロール変更はドロップダウン形式
- 検索機能でメンバーをフィルタリング

### フロントエンド
```javascript
// メンバー管理のメイン機能
const initializeMemberManagement = (cid) => {
  loadMembers(cid);
  setupMemberActions();
  setupMemberSearch();
};

// メンバー一覧取得
const loadMembers = async (cid) => {
  // socket.emit('plugins.caiz.getMembers', {cid})
};

// メンバーロール変更
const changeMemberRole = async (uid, role) => {
  // socket.emit('plugins.caiz.changeMemberRole', {uid, role})
};

// メンバーの追加
const addMember = async (username) => {
  // socket.emit('plugins.caiz.addMember', {username})
};
```

### バックエンド
```javascript
// 新規ソケットイベント
sockets.caiz.getMembers = Community.GetMembers;
sockets.caiz.addMember = Community.AddMember;
sockets.caiz.changeMemberRole = Community.ChangeMemberRole;
sockets.caiz.removeMember = Community.RemoveMember;
sockets.caiz.banMember = Community.BanMember;
```

### データベース設計
- NodeBBの既存グループシステムを活用
- コミュニティごとの権限グループ管理
  - `community-{cid}-owners`
  - `community-{cid}-managers` 
  - `community-{cid}-members`
  - `community-{cid}-banned`

## UI/UX要件

### メンバー一覧表示
- ユーザー名、アバター、ロール、参加日を表示
- ロールごとの色分け表示
- ページネーション対応
- アクティブ状態の表示

### メンバー検索・追加
- ユーザー名での検索機能
- オートコンプリート機能
- 重複チェック機能
- 招待通知システム

### ロール管理
- ドロップダウンでロール変更
- 権限変更の確認ダイアログ
- ロール変更履歴の記録
- 一括操作機能

## バリデーション・権限チェック

### 権限チェック
- オーナーのみが他のオーナーを指定可能
- マネージャー以上がメンバーロールを変更可能
- オーナーのみがバン権限を実行可能
- 自分自身のロール変更制限

### バリデーション
- ユーザーの存在確認
- 重複メンバーチェック
- ロール変更権限の検証
- コミュニティの有効性確認

## エラーハンドリング
- 権限不足エラーの適切な処理
- 存在しないユーザーへの対応
- ネットワークエラーの処理
- 操作失敗時のロールバック

## セキュリティ要件
- ロール変更操作の厳格な権限チェック
- CSRF対策の実装
- 入力値のサニタイゼーション
- 操作ログの記録

## 関連ファイル
- `/plugins/nodebb-plugin-caiz/static/community-edit.js`
- `/plugins/nodebb-plugin-caiz/libs/community.js`
- `/plugins/nodebb-plugin-caiz/templates/partials/community-edit-modal.tpl`
- `/plugins/nodebb-plugin-caiz/library.js`