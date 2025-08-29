# コミュニティ名の多言語化（作成時）

- スコープ: 作成フローにおけるコミュニティ名・スラグ・詳細の多言語入力・検証・保存仕様（実装なし）
- 前提: すべてNodeBBプラグインとして実装し、通信はWebSocket。フォールバックは禁止（未入力の言語は明確にエラー）。
- 目的: 作成時点で多言語の名称データを受け取り、検証可能なインタフェースを定義する。

## 要件

- 入力値は「言語コード → 文字列」のフラットなマップとする（例: `ja`, `en-US`, `en-GB`）。
- 必須言語は `defaultLocale` と一致するキー。未提供の場合はエラー。
- スラグは言語ごとに検証（半角英数・ハイフンのみ、重複禁止）。
- ハードコーディング禁止。設定取得失敗時はエラーにする。
- NodeBB i18nはUI文言用であり、ユーザ生成データ（コミュニティ名）は翻訳キーにしない（保存はプレーンテキスト）。

## インタフェース（コードは英語、実装なし）

```ts
export type Locale = string; // e.g., 'ja', 'en-US', 'en-GB'

export interface LocalizedTextMap {
  [locale: string]: string;
}

export interface CreateCommunityPayload {
  names: LocalizedTextMap;        // display names per locale
  slugs: LocalizedTextMap;        // URL slugs per locale
  descriptions?: LocalizedTextMap; // optional descriptions per locale
  defaultLocale: Locale;          // required base locale
  logoUrl?: string;               // optional logo URL
}

export type ValidationErrorCode =
  | 'MISSING_DEFAULT_LOCALE'
  | 'MISSING_NAME'
  | 'MISSING_SLUG'
  | 'INVALID_SLUG_FORMAT'
  | 'DUPLICATE_SLUG'
  | 'EMPTY_VALUE';

export interface ValidationError {
  field: 'names' | 'slugs' | 'descriptions' | 'defaultLocale';
  locale?: Locale;
  code: ValidationErrorCode;
  message: string; // human-readable explanation
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface CreateCommunityResult {
  id: string;
  createdAt: string; // ISO timestamp
}

// Command pattern to decouple validation and persistence
export interface CreateCommunityCommand {
  payload: CreateCommunityPayload;
}

export interface CommunityI18nService {
  // Validate payload without side effects; no fallbacks allowed
  validateCreatePayload(payload: CreateCommunityPayload): ValidationResult;

  // Build a command from validated payload; must throw if invalid
  buildCreateCommand(payload: CreateCommunityPayload): CreateCommunityCommand;
}

// Persistence boundary (to be implemented elsewhere)
export interface CommunityRepository {
  // Check slug existence per locale
  existsSlug(locale: Locale, slug: string): Promise<boolean>;

  // Execute create command and return created id
  create(cmd: CreateCommunityCommand): Promise<CreateCommunityResult>;
}
```

## バリデーション方針

- defaultLocale:
  - 必須。空値はエラー（`MISSING_DEFAULT_LOCALE`）。
- names / slugs:
  - `defaultLocale` キーは必須（`MISSING_NAME`/`MISSING_SLUG`）。
  - 空文字はエラー（`EMPTY_VALUE`）。
  - スラグは `^[a-z0-9-]+$` のみ許可。違反は `INVALID_SLUG_FORMAT`。
  - 競合チェックは言語別に行い、重複時は `DUPLICATE_SLUG`。
- descriptions:
  - 任意。存在する場合、空文字は禁止（`EMPTY_VALUE`）。

## エラーハンドリング

- フォールバック禁止。必須値欠落時は即エラーを返す。
- エラーは `ValidationResult.errors[]` に集約し、クライアントへ明示的に通知する。

## 非機能

- セキュリティ: スラグ/名称は最小限の正規化を前提（XSS対策は保存層/表示層で別途実施）。
- 互換性: 既存の単一言語データとは共存可能なスキーマ移行を想定（実装は別タスク）。

