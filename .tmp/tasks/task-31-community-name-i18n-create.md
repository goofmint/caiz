# コミュニティ名の多言語化（作成時）

- スコープ: 入力は「コミュニティ名」と「説明文」のみ（言語は任意）。Gemini 2.5 Flash で20言語へ機械翻訳し、DBに保存・表示に利用する（実装なし）。
- 前提: nodebb-plugin-caiz の機能を拡張し、通信はWebSocket。フォールバックは禁止（要求言語が未生成の場合はエラー）。
- 目的: 作成時点で入力テキストを20言語へ翻訳し、保存・表示で一貫利用できるインタフェース仕様を定義する。

## 要件

- 入力: `name`（必須）, `description`（任意）。入力言語は任意（`sourceLocale`は指定可）。
- 翻訳: Gemini 2.5 Flash を用いて、以下20言語 `LANG_KEYS` に対して翻訳を作成する。
- 保存: 生成した各言語の `name` と `description` をDBへ保存。UI表示も保存済みデータを参照する。
- 設定: Gemini APIキーは管理画面で設定・保存（ハードコーディング禁止）。
- 注意: NodeBBのi18nはUI文言用。コミュニティ名/説明文はユーザ生成データのため翻訳キーにしない。

```ts
export const LANG_KEYS: ReadonlyArray<string> = [
  "en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
  "id","de","ja","fil","tr","ko","fa","sw","ha","it",
];
```

## インタフェース（コードは英語、実装なし）

```ts
export type Locale = string; // e.g., 'ja', 'en', 'en-US'

export interface CommunityCreateInput {
  name: string;              // required source text
  description?: string;      // optional source text
  sourceLocale?: Locale;     // optional, for explicit source language
}

export interface CommunityTranslations {
  name: Record<Locale, string>;        // translated names per locale (must include all LANG_KEYS)
  description: Record<Locale, string>; // translated descriptions per locale (keys correspond to LANG_KEYS)
}

export interface GeminiConfig {
  apiKey: string;                // configured via admin UI
  model: 'gemini-2.5-flash';     // fixed model identifier
}

export type TranslationErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_INPUT'
  | 'TRANSLATION_FAILED'
  | 'UNSUPPORTED_LOCALE';

export interface TranslationError {
  code: TranslationErrorCode;
  message: string;
  locale?: Locale; // target or source locale context
}

export interface TranslationResult {
  ok: boolean;
  data?: CommunityTranslations;
  errors?: TranslationError[];
}

export interface TranslationService {
  // Translate into exactly LANG_KEYS; no fallbacks if some language fails
  translateCommunityInfo(
    input: CommunityCreateInput,
    targets: ReadonlyArray<Locale>,
    config: GeminiConfig,
  ): Promise<TranslationResult>;
}

export interface AdminSettings {
  getGeminiApiKey(): Promise<string>;     // must reject if not set
  setGeminiApiKey(key: string): Promise<void>;
}

export interface CommunityRepository {
  saveTranslations(
    communityId: string,
    translations: CommunityTranslations,
  ): Promise<void>;

  getTranslations(communityId: string): Promise<CommunityTranslations>;
}

export interface CommunityDisplayService {
  // Use saved translations for rendering; error if requested locale not in LANG_KEYS
  getDisplayTexts(
    translations: CommunityTranslations,
    locale: Locale,
  ): { name: string; description?: string };
}
```

## バリデーション/エラーポリシー

- 入力検証: `name` は必須。空文字は禁止（`INVALID_INPUT`）。
- 設定検証: 管理画面にAPIキーが未設定なら `MISSING_API_KEY` とする。
- 翻訳要求: 生成対象は `LANG_KEYS` のみ。対象外言語は `UNSUPPORTED_LOCALE`。
- 完全性: 20言語のいずれかが翻訳失敗した場合は `TRANSLATION_FAILED` とし、フォールバックでの穴埋めは禁止（保存・表示とも）。

## 保存/表示の方針

- 保存: 作成直後に20言語の翻訳結果をDBへ保存する。UIは保存済みデータを参照し、都度APIで再翻訳しない。
- 表示: クライアントの要求ロケールが `LANG_KEYS` に含まれ、且つ保存済みである場合のみ表示可能。未保存なら明示的にエラー。

## 管理画面

- Gemini APIキーを入力・保存できるシンプルな設定UIを提供する（実装は別タスク）。
- 取得失敗時はエラーとし、翻訳処理は開始しない。
