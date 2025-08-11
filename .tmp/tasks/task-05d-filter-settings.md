# Task 05d: フィルターの設定

## 概要

AIモデレーションを適用するコンテンツタイプを管理画面から選択できるようにする。実際のモデレーション処理はまだ実装せず、設定の保存と読み込み、およびログベースでの動作確認のみを実装する。

## 対象

- [ ] トピック作成、投稿、返信に対するフィルター設定

## 詳細仕様

### フィルター設定項目

管理画面で以下の3つのコンテンツタイプごとにモデレーションの有効/無効を設定：
- トピック作成（新規トピック投稿）
- ポスト作成（トピックへの返信）  
- ポスト編集（既存投稿の編集）

#### 設定項目

```javascript
{
  "filters": {
    "topicCreate": true,
    "postCreate": true,
    "postEdit": true
  }
}
```

#### フロントエンド仕様

管理画面テンプレートに新しいセクションを追加：

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

#### 国際化対応

日本語:
- `filter-settings`: "モデレーション対象"
- `filter-topic-create`: "新規トピック作成"
- `filter-post-create`: "返信投稿"
- `filter-post-edit`: "投稿編集"

英語:
- `filter-settings`: "Moderation Filters"
- `filter-topic-create`: "Topic Creation"
- `filter-post-create`: "Post Creation"  
- `filter-post-edit`: "Post Editing"

#### バックエンド仕様

各フックハンドラーで設定値を参照し、ログ出力のみ実行：

```javascript
// libs/hooks/topics.js
async moderateTopicCreate(hookData) {
  const settings = await getSettings();
  winston.info('[ai-moderation] Topic create filter check', { 
    enabled: !!settings.filters?.topicCreate 
  });
  
  if (!settings.filters?.topicCreate) {
    winston.info('[ai-moderation] Topic moderation disabled, skipping');
    return hookData;
  }
  
  winston.info('[ai-moderation] Topic moderation enabled - would process here');
  return hookData;
}
```

## 成功条件

- 管理画面にフィルター設定のチェックボックスが3つ表示される
- 各チェックボックスの状態を保存できる
- 保存した設定値が画面リロード時に復元される
- フックハンドラーでログによる設定値確認ができる（実際のモデレーション処理はスキップ）