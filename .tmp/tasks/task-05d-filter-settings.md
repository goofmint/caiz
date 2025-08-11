# タスク 05d: フィルター設定（トピック作成、コメント作成、返信）

## 概要
AIモデレーションを適用するコンテンツタイプを管理画面から選択できるようにする。実際のモデレーション処理はまだ実装せず、設定の保存と読み込みのみを実装する。

## 要件

### フィルター設定
管理画面で以下のコンテンツタイプごとにモデレーションの有効/無効を設定：
- トピック作成（新規トピック投稿）
- ポスト作成（トピックへの返信）
- ポスト編集（既存投稿の編集）

### UI仕様
- 各コンテンツタイプにチェックボックスを配置
- デフォルトではすべて有効（チェック済み）
- 設定変更後、「設定を保存」ボタンで保存

### データ構造
```javascript
{
  filters: {
    topicCreate: true,    // 新規トピック作成時のモデレーション
    postCreate: true,     // 返信投稿時のモデレーション
    postEdit: true        // 投稿編集時のモデレーション
  }
}
```

## 技術実装

### バックエンド
`libs/core/settings.js`の設定処理に追加：
```javascript
// デフォルト値
const defaultFilters = {
  topicCreate: true,
  postCreate: true,
  postEdit: true
};

// 保存時の処理
saveSettings(data) {
  // filters設定のバリデーション
  if (data.filters) {
    data.filters = {
      topicCreate: !!data.filters.topicCreate,
      postCreate: !!data.filters.postCreate,
      postEdit: !!data.filters.postEdit
    };
  }
}
```

### フロントエンド
管理画面テンプレート（`ai-moderation.tpl`）に追加：
```html
<div class="form-group">
  <label>[[ai-moderation:filter-settings]]</label>
  <div class="checkbox">
    <label>
      <input type="checkbox" name="filters.topicCreate" checked>
      [[ai-moderation:filter-topic-create]]
    </label>
  </div>
  <div class="checkbox">
    <label>
      <input type="checkbox" name="filters.postCreate" checked>
      [[ai-moderation:filter-post-create]]
    </label>
  </div>
  <div class="checkbox">
    <label>
      <input type="checkbox" name="filters.postEdit" checked>
      [[ai-moderation:filter-post-edit]]
    </label>
  </div>
</div>
```

### 言語ファイル
```json
{
  "filter-settings": "モデレーション対象",
  "filter-topic-create": "新規トピック作成",
  "filter-post-create": "返信投稿",
  "filter-post-edit": "投稿編集"
}
```

## フック連携（設定値の参照のみ）
各フックハンドラーで設定値を確認する準備：
```javascript
// libs/hooks/topics.js
async moderateTopicCreate(hookData) {
  const settings = await getSettings();
  if (!settings.filters?.topicCreate) {
    // モデレーション無効時はスキップ
    return hookData;
  }
  // 実際のモデレーション処理は未実装
  return hookData;
}
```

## 完了条件
- [ ] 管理画面にフィルター設定のチェックボックスが表示される
- [ ] 各チェックボックスの状態を保存できる
- [ ] 保存した設定値が画面リロード時に復元される
- [ ] フックハンドラーで設定値を参照できる（処理はスキップ）