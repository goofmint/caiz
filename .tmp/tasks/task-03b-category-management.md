# Task 03b: コミュニティ内カテゴリー管理機能

## タスク概要
コミュニティ内のサブカテゴリーを管理（追加、削除、編集）する機能を実装する。

## 実装範囲
- [ ] コミュニティ編集モーダルの「Categories」タブに実際の機能を追加
- [ ] 既存サブカテゴリーの一覧表示
- [ ] 新規サブカテゴリーの追加
- [ ] 既存サブカテゴリーの編集
- [ ] サブカテゴリーの削除
- [ ] カテゴリーの順序変更（並び替え）

## 技術仕様

### UI設計
- コミュニティ編集モーダルの既存「Categories」タブを活用
- カテゴリー一覧をテーブルまたはカード形式で表示
- 各カテゴリーに編集・削除ボタンを配置
- 「Add Category」ボタンで新規追加

### フロントエンド
```javascript
// カテゴリー管理のメイン機能
const initializeCategoryManagement = (cid) => {
  loadSubCategories(cid);
  setupCategoryActions();
  setupSortable();
};

// サブカテゴリー一覧取得
const loadSubCategories = async (cid) => {
  // socket.emit('plugins.caiz.getSubCategories', {cid})
};

// カテゴリー追加・編集・削除のイベントハンドラー
const setupCategoryActions = () => {
  // 追加、編集、削除ボタンのイベントリスナー
};
```

### バックエンド
```javascript
// 新規ソケットイベント
sockets.caiz.getSubCategories = Category.GetSubCategories;
sockets.caiz.createSubCategory = Category.CreateSubCategory;  
sockets.caiz.updateSubCategory = Category.UpdateSubCategory;
sockets.caiz.deleteSubCategory = Category.DeleteSubCategory;
sockets.caiz.reorderSubCategories = Category.ReorderSubCategories;
```

### データベース操作
- NodeBBの既存Categories APIを活用
- `parentCid`を使用してサブカテゴリーを管理
- カテゴリーの順序は`order`フィールドで制御

## UI/UX要件

### カテゴリー一覧表示
- カテゴリー名、説明、投稿数、最終更新日を表示
- ドラッグ&ドロップで順序変更可能
- 各行に編集・削除アクションボタン

### カテゴリー追加・編集フォーム
- カテゴリー名（必須）
- 説明文
- アイコン選択（FontAwesome）
- 表示順序
- アクセス権限設定（将来拡張）

### バリデーション
- カテゴリー名の重複チェック
- 必須項目のバリデーション
- カテゴリー名の文字数制限

## エラーハンドリング
- 権限チェック（コミュニティオーナーのみ）
- 削除時の確認ダイアログ
- サブカテゴリーに投稿がある場合の削除制限
- ネットワークエラーの適切な処理

## セキュリティ要件
- コミュニティオーナー権限の厳格なチェック
- 入力値のサニタイゼーション
- CSRF対策

## パフォーマンス考慮事項
- カテゴリー一覧の効率的な取得
- リアルタイム更新での過度なAPIコール防止
- 大量サブカテゴリーでの表示パフォーマンス

## 関連ファイル
- `/plugins/nodebb-plugin-caiz/static/community-edit.js`
- `/plugins/nodebb-plugin-caiz/libs/community.js` 
- `/plugins/nodebb-plugin-caiz/templates/partials/community-edit-modal.tpl`
- `/plugins/nodebb-plugin-caiz/library.js`