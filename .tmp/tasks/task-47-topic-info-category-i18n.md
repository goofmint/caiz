# 47: div.topic-info のカテゴリー名 i18n 設計ドキュメント

## 概要
- 対象: テーマ内の `div.topic-info` に表示される「カテゴリー名」の表示が多言語処理されていない不具合。
- 目的: NodeBBのi18nルールに準拠し、カテゴリ名表示が選択言語に沿って適切に翻訳される設計を定義する（実装は本タスクでは行わない）。

## 背景と制約（必読）
- 翻訳キー形式: `[[namespace:key]]`。ネスト構造は禁止。言語JSONはフラット構造で同一キーを `ja`, `en-US`, `en-GB` に揃える。
- 実装前に調査: NodeBB翻訳の仕組み、`translator.translate()` の正しい使い方、テンプレート側の `app.parseAndTranslate()` の適用範囲（単一キーには使わない）。
- 既存の動作は保持: window.socket、acpScripts、引数順序・関数シグネチャは変更しない。
- フォールバック禁止: 取得できない場合は明確なエラーにする。隠れフォールバック（`|| 'default'`）は設計上も不可。

## 対象箇所の想定
- テーマテンプレート（例: `topic.tpl` 付近）にある `div.topic-info` のカテゴリ名表示領域。
- クライアントJSでラベルやテキストを後処理している箇所があれば、そこも対象（テンプレートとJSのいずれか、または両方）。

## 設計方針
1) カテゴリ名自体を翻訳キー表現で扱えるかを調査し、可能ならキー化して `translator.translate()` を適用。
2) カテゴリ表示ラベル（例: "Category" など静的UIテキスト）は専用キーを作成し、テンプレート（またはJS）で翻訳適用。
3) すべての言語ファイルに同一キーを追加（フラット構造）。
4) 影響範囲の確認は `rg` で該当テンプレート・JSの使用箇所を網羅調査して一括修正計画を立案。

## 翻訳キー設計（例）
- namespace は既存の慣例に合わせる（例: `caiz:`）。
- 静的ラベル: `[[caiz:topic.category-label]]` は禁止（ネストNG）→ `[[caiz:topic-category-label]]` のようにフラット化。
- 動的カテゴリ名:
  - 方式A: カテゴリごとに事前に翻訳キーを割り当てて保存（推奨・既存データ構造と要相談）。
  - 方式B: 既存の多言語フィールド（例: name_ja, name_en）を選択して表示（NodeBB仕様に依存、未確認）。
  - いずれも「未設定時の暗黙フォールバック」は禁止。未定義はエラー表示ポリシーを設ける。

## 言語ファイル変更方針
- 追加先: `plugins/<target-plugin>/languages/ja/<ns>.json`, `en-US/<ns>.json`, `en-GB/<ns>.json`（実際の配置は既存構成に合わせる）。
- 例（フラット構造）:
  - ja: `"topic-category-label": "カテゴリー"`
  - en-US: `"topic-category-label": "Category"`
  - en-GB: `"topic-category-label": "Category"`

## 調査タスク（実装前提の把握のみ）
- NodeBBのテンプレート内でカテゴリ名がどのように渡されるか（サーバ側モデル/ヘルパなど）。
- 既存のi18n適用箇所と未適用箇所の差分。
- `translator.translate()` の呼び出しコンテキスト（クライアント/サーバ）と非同期制御の正しい使い方。

## インタフェース定義（実装しない）
```ts
// Returns translated UI label for the topic category section.
export function getTopicCategoryLabelKey(): string;

// Resolves a translation for a given key using NodeBB translator.
export async function translateKey(key: string): Promise<string>;

// Returns an identifier (key or id) to locate the localized category name.
export function getCategoryI18nIdentifier(categoryId: number): string;

// Resolves the localized category display name for the given identifier.
export async function resolveLocalizedCategoryName(identifier: string): Promise<string>;

// Renders the translated label + localized name into a given container.
export function renderTopicInfoCategory(container: HTMLElement, label: string, name: string): void;
```

### インタフェースの意図
- `getTopicCategoryLabelKey`: 静的ラベル用キーを返す（キーはフラット構造）。
- `translateKey`: `translator.translate()` を用いた単一キーの正しい翻訳取得（引数順序や戻り値は既存に合わせる。ここでは抽象化のみ）。
- `getCategoryI18nIdentifier`: カテゴリの翻訳名を引くための識別子（キー名 or ID→キー変換）。
- `resolveLocalizedCategoryName`: 識別子から言語に応じた表示名を取得する。フォールバックは禁止、未定義はエラー通知方針。
- `renderTopicInfoCategory`: 既存DOM構造を壊さず、選択言語のラベル+名称を描画。

## 影響範囲と検証観点
- 影響: トピック詳細ページのヘッダー情報、パンくず連携有無、検索インデックスへの影響無し（表示のみ）。
- 検証:
  - 言語切替時にラベル/カテゴリ名が即時反映されること。
  - 全言語ファイルにキーが存在すること（欠落時はエラー）。
  - テンプレート、JSいずれも引数順序や公開APIを変更していないこと。

## 想定するエラー方針
- キー未定義/カテゴリ名未定義は明示的にログ出力し、UIにも翻訳エラーを明示（仮テキストではなく、エラーキーをそのまま表示など）。
- フォールバック禁止により、問題の早期発見を優先。

## 実装外（このタスクではやらない）
- 実コードの改修（テンプレート/JS）。
- 言語ファイルの追加/更新PRの反映。
- translatorの実呼び出し検証。

