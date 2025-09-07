# タスク48: 投稿編集時の再モデレーション機能

## 概要
既存の投稿やトピックが編集された際に、AI モデレーションを再実行する機能を実装する。編集内容が不適切な場合、自動的にモデレーション待ちフラグを設定し、モデレーターが再確認できるようにする。

## 背景
現在のAIモデレーション機能（`nodebb-plugin-ai-moderation`）は新規投稿・新規トピック作成時のみに動作するが、投稿が編集された場合は再チェックが行われない。これにより、以下の問題が発生する可能性がある：

1. 適切な内容で投稿後、不適切な内容に編集される
2. モデレーション済み投稿が再び問題のある内容に変更される
3. 編集履歴を悪用したルール回避

## 要件

### 基本要件
- 投稿・トピック編集時にAIモデレーション機能を自動実行
- しきい値を超える場合、投稿をモデレーション待ち状態に変更
- 編集前の内容と編集後の内容を比較し、変更があった場合のみモデレーション実行
- 既存の `nodebb-plugin-ai-moderation` プラグインへのカスタマイズとして実装

### 機能仕様

#### 1. 編集検知機能
```javascript
// NodeBBフックを利用した編集検知
// hooks: action:post.edit, action:topic.edit
editModerationHandler.onPostEdit = async (hookData) => {
  // 編集前後の内容を比較
  // 変更があった場合のみモデレーション実行
};
```

#### 2. 再モデレーション実行
```javascript
// 既存のmoderationService.jsを拡張
moderationService.remoderate = async (postData, originalContent) => {
  // 編集後の内容をAI APIに送信
  // しきい値判定
  // フラグ設定
};
```

#### 3. モデレーション結果処理
```javascript
// 編集時専用の処理フロー
editModerationHandler.processResult = async (postId, moderationResult) => {
  // しきい値超過時の処理
  // モデレーター通知
  // ログ記録
};
```

### 設定項目
管理画面（`/admin/plugins/ai-moderation`）に以下の設定を追加：

- **編集時再モデレーション有効化**: チェックボックス
- **編集時しきい値**: 新規投稿時と同じ or 個別設定可能
- **最小変更量**: 軽微な編集（誤字修正等）を除外する文字数・変更率の閾値

### 技術仕様

#### 対象Hook
- `action:post.edit`: 投稿編集後
- `action:topic.edit`: トピック編集後（タイトル・本文）

#### 実装ファイル
```
plugins/nodebb-plugin-ai-moderation/
├── lib/
│   └── edit-moderation-handler.js     (新規作成)
├── library.js                         (フック追加)
└── static/templates/admin/            (設定UI更新)
    └── plugins/
        └── ai-moderation.tpl
```

#### APIフロー
1. 投稿編集 → NodeBBフック発火
2. 編集前後コンテンツ比較
3. 変更検知時 → AI API呼び出し
4. モデレーション結果判定
5. しきい値超過時 → 投稿ステータス変更

### モデレーションロジック

#### 変更検知
```javascript
// 編集内容の変更検知ロジック
function hasSignificantChange(originalContent, editedContent, minChangeThreshold) {
  // テキスト差分計算
  // 最小変更量による除外判定
  // 返り値: true/false
}
```

#### 再モデレーション判定
```javascript
// 再モデレーション実行判定
async function shouldRemoderate(postData, editData, settings) {
  // 設定確認: 編集時モデレーション有効？
  // 変更量確認: 最小変更量を超えているか？
  // 権限確認: 編集者の権限レベル（モデレーター等は除外可能）
}
```

### ユーザーフロー

#### 通常の編集
1. ユーザーが投稿を編集
2. 保存時に自動でAIモデレーション実行
3. 適切な内容の場合 → そのまま公開
4. 不適切な内容の場合 → モデレーション待ち状態

#### モデレーション待ち状態
- 投稿者: 編集内容が確認中である旨の表示
- モデレーター: 管理画面で編集された投稿の再確認
- 他ユーザー: 編集前の内容または非表示

### エラーハンドリング
- AI API障害時: 編集を許可してログに記録
- ネットワークエラー時: リトライ機構
- 設定エラー時: フォールバック動作

### ログ・監査
- 編集時モデレーション実行ログ
- AI判定結果の記録
- モデレーター行動履歴

## 実装時の考慮事項

### パフォーマンス
- 軽微な編集（誤字修正等）での無駄なAPI呼び出し回避
- 編集頻度が高いユーザーへの配慮
- APIレート制限対応

### 権限管理
- モデレーター権限を持つユーザーの編集は除外可能
- コミュニティオーナーの編集ポリシー設定

### 既存機能への影響
- 既存のモデレーション機能との統合
- 投稿編集機能への影響最小化
- 管理画面の一貫性維持

## 参考資料
- 既存の `nodebb-plugin-ai-moderation` プラグイン仕様
- NodeBB Edit Hooks ドキュメント
- OpenAI Moderation API 仕様