# パンくずリストの多言語対応（設計ドキュメント）

## 背景
- 現状、パンくずリストのラベルが翻訳キー経由ではなく、言語切替（`ja` / `en-US` / `en-GB`）に追従していない箇所がある。
- NodeBBの翻訳システム（i18n）に準拠し、テンプレートおよびスクリプト側で正しいキー解決を行う必要がある。

## 目的 / スコープ
- 目的: パンくずリストの全ラベルをNodeBB i18nで翻訳可能にする。
- スコープ: UIに表示されるパンくずラベル（例: Home, Categories, Community, Topic 等）。
- 非スコープ: ルーティング、`window.socket`／`acpScripts` など既存の動作中ロジックの変更（デグレ防止のため）。

## 必須ルール（NodeBB i18n）
- 翻訳キー形式: `[[namespace:key]]`（例: `[[caiz:breadcrumb-home]]`）。
- 言語ファイルはフラット構造（ネスト禁止）。
- すべての対象言語（`ja`、`en-US`、`en-GB`）で同一キーを用意。
- 単一キーの翻訳には `translator.translate()` を用いる（`app.parseAndTranslate()`はテンプレート向けで誤用しない）。
- フォールバックは禁止。キー未定義は明示的なエラーとして扱う。

## 翻訳キー（案）
- `[[caiz:breadcrumb-home]]`
- `[[caiz:breadcrumb-categories]]`
- `[[caiz:breadcrumb-community]]`（コミュニティ固定ラベル）
- `[[caiz:breadcrumb-topic]]`（トピック固定ラベル）
- `[[caiz:breadcrumb-page]]`（ページ番号などの汎用ラベルに使用する場合）

注: 実装時は既存テンプレート/スクリプトの使用箇所を `grep` で網羅的に洗い出し、キー名の一貫性を維持すること。

## インタフェース（コードはインタフェースのみ / 英語）

```ts
// Breadcrumb item model
export interface BreadcrumbItem {
  // Translation key in the form of "namespace:key" without brackets
  // Example: "caiz:breadcrumb-home"
  textKey: string;
  // Optional replacement parameters for translator (flat key-value strings)
  textParams?: Record<string, string>;
  // Optional URL for navigation
  href?: string;
}

// Collection of breadcrumb items for a view
export interface BreadcrumbModel {
  items: BreadcrumbItem[];
}

// Translate a single breadcrumb key using NodeBB translator
// Note: Implementation must use `translator.translate()` with strict error handling
export declare function translateBreadcrumb(
  key: string,
  params?: Record<string, string>
): Promise<string>;

// Build a breadcrumb model for a given context (e.g., category/topic)
// Note: No routing or side effects; pure data assembly
export declare function buildBreadcrumbModel(
  context: {
    // Provide identifiers needed to assemble labels only (no fetching here)
    type: 'home' | 'categories' | 'community' | 'topic';
    nameKey?: string; // e.g., "caiz:breadcrumb-community" if needed
  }
): BreadcrumbModel;
```

## 非機能要件 / 制約
- 既存の動作している機能は変更しない（デグレ防止）。
- インタフェースのみ定義し、実装は後続（本ドキュメントは実装を含まない）。
- ハードコーディングの文言は排除し、必ず翻訳キーを経由。
- 引数順序・関数シグネチャは確定後に固定し、無断変更しない。

## 検証観点（概要）
- ロケール `ja` / `en-US` / `en-GB` でパンくずがそれぞれ正しい文言になる。
- 未定義キーが存在しない（全言語でキー構造が一致）。
- 既存のテンプレート/JSにおける `app.parseAndTranslate()` の誤用がない。
