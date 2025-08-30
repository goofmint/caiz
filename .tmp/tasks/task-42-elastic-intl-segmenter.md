# 42: インデックスの多言語対応（Intl.Segmenter）

- [ ] Intl.Segmenter による多言語トークナイズの導入（インデックス時）

## 目的

検索インデックス作成時に、ブラウザ/Node.js 標準の `Intl.Segmenter` を用いて言語に応じたトークナイズを行い、言語によらず安定した検索品質を確保する。

## 対象フック（インデックス更新タイミング）

- action:post.save
- action:post.delete
- action:post.restore
- action:post.edit
- action:topic.post
- action:topic.delete
- action:topic.restore
- action:topic.edit

## 設計メモ（インタフェースのみ／実装なし）

```ts
// Language-aware tokenizer interface using Intl.Segmenter
export interface Tokenizer {
  tokenize(input: string, locale: string): string[]; // Split to words according to locale
}

export interface SegmenterConfig {
  granularity: 'word' | 'sentence'; // default: 'word'
}

export interface TokenizationResult {
  locale: string;      // normalized BCP-47 (e.g., 'ja', 'en-US')
  tokens: string[];    // normalized tokens to be indexed
}

export interface IndexDocumentPayload {
  id: string;                // 'post:<pid>' | 'topic:<tid>'
  type: 'post' | 'topic';
  cid: number;
  tid?: number;
  pid?: number;
  title?: string;            // raw
  content?: string;          // raw
  locale: string;            // userLang / detected
  createdAt: string;         // ISO8601
  updatedAt: string;         // ISO8601
}

// Hook payloads (shape only)
export interface PostSaveEvent { post: { pid: number; tid: number; cid: number; content: string; userLang?: string; timestamp?: number; updated?: number; deleted?: number; }; }
export interface PostDeleteEvent { post: { pid: number; tid: number; }; }
export interface PostRestoreEvent { post: { pid: number; tid: number; }; }
export interface PostEditEvent {  post: { pid: number; tid: number; content: string; userLang?: string; updated?: number; }; }
export interface TopicPostEvent { topic: { tid: number; cid: number; title: string; userLang?: string; timestamp?: number; updated?: number; deleted?: number; }; }
export interface TopicDeleteEvent { topic: { tid: number; }; }
export interface TopicRestoreEvent { topic: { tid: number; }; }
export interface TopicEditEvent {  topic: { tid: number; title: string; userLang?: string; updated?: number; }; }

// Indexer interface (only signatures)
export interface Indexer {
  onPostSave(e: PostSaveEvent): Promise<void>;
  onPostDelete(e: PostDeleteEvent): Promise<void>;
  onPostRestore(e: PostRestoreEvent): Promise<void>;
  onPostEdit(e: PostEditEvent): Promise<void>;
  onTopicPost(e: TopicPostEvent): Promise<void>;
  onTopicDelete(e: TopicDeleteEvent): Promise<void>;
  onTopicRestore(e: TopicRestoreEvent): Promise<void>;
  onTopicEdit(e: TopicEditEvent): Promise<void>;
}
```

## 取り扱いルール

- フォールバック禁止: ロケールや入力が不正な場合は明示エラーにする
- 実装は別タスク。ここではインタフェースと適用ポイントのみを定義
- 検索側は単一インデックス運用（言語で分割しない）

