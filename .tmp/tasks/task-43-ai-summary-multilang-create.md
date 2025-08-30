## 43: AIトピックサマリーの多言語化（作成時）

- [ ] トピックのサマリー作成時に、多言語（20言語）で同時生成・保存する

### 目的

トピック作成や既存トピックの定期サマリー生成時に、サマリー本文を20言語で同時生成して保存し、表示時にユーザー言語へ即時切替できるようにする。

### 要件

- 生成対象言語は既存の共通20言語セット（`en, zh-CN, hi, es, ar, fr, bn, ru, pt, ur, id, de, ja, fil, tr, ko, fa, sw, ha, it`）
- フォールバック禁止（欠落言語がある場合は保存エラーとして扱い、明示ログ＋再試行ポリシーを別途定義）
- 保存構造は「原文＋translations（言語→要約テキスト）」のフラットキー
- NodeBBの標準検索置換に合わせ、将来的に検索側が多言語サマリーを利用できるようにする（本タスクでは生成・保存のみ）

### インタフェース（仕様のみ／実装なし）

```ts
// Target languages (20)
export type LangKey = 'en'|'zh-CN'|'hi'|'es'|'ar'|'fr'|'bn'|'ru'|'pt'|'ur'|
  'id'|'de'|'ja'|'fil'|'tr'|'ko'|'fa'|'sw'|'ha'|'it';

// Summary generation request
export interface SummaryRequest {
  tid: number;            // Topic id
  title: string;          // Topic title
  content: string;        // Aggregated content (latest N posts or selected window)
  maxTokens?: number;     // Model-specific constraint
}

// Summary translations payload
export interface SummaryTranslations {
  original: string;                      // Original language summary (model primary)
  translations: Record<LangKey, string>; // Per-language summary text
  createdAt: number;                     // epoch ms
}

// Storage adapter
export interface SummaryStore {
  save(tid: number, data: SummaryTranslations): Promise<void>;
  get(tid: number): Promise<SummaryTranslations | null>;
}

// Summarization client (LLM側)
export interface SummarizerClient {
  summarizeMultiLang(req: SummaryRequest, langs: LangKey[]): Promise<SummaryTranslations>;
}

// Plugin public API (to be invoked on topic save / scheduled job)
export interface AiSummaryService {
  generateAndSave(req: SummaryRequest): Promise<void>; // throws on missing languages
}

// Hooks (NodeBB integration shape only)
export interface TopicSaveEvent { topic: { tid: number; title: string; }; posts?: Array<{ pid: number; content: string }>; }
```

### 生成フロー（概要）

1. 対象トピックの要約対象本文を集約（最新投稿N件または一定期間）
2. SummarizerClient.summarizeMultiLang へ投入（20言語）
3. 返却オブジェクトの完全性検証（全言語が非空）
4. SummaryStore.save(tid, translations) へ保存（原文＋translations）
5. 失敗時は明示ログ出力（再試行は別ジョブで管理／フォールバック禁止）

### 保存キー（例）

```ts
// Hash key per topic
// key: ai-summary:topic:<tid>
// fields: original, translations[lang], created
```

### 注意事項

- 生成は「サマリー作成時」のみ（表示時のi18n切替は別タスク）
- 欠落言語がある場合は例外（保存せず失敗させ、ジョブ側で再試行）
