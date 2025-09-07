# 48: 投稿編集時の再翻訳（nodebb-plugin-auto-translate）

- [ ] ドキュメントレビュー完了（レビュー後に実装着手）

## 概要
- 目的: 投稿（本文/タイトル）を編集した際、対象言語の自動翻訳を再実行し、既存翻訳を更新する。
- 対象: `nodebb-plugin-auto-translate`
- 変更範囲: サーバー側フックでの検知、既存翻訳レコードの再生成/上書き、ログ出力。
- 非対象: UI変更、管理画面項目追加、将来的な最適化、フォールバック処理。

## 前提/制約
- 設定は既存の投稿時の処理にプロンプトに従う。設定未取得時はエラーとする（フォールバック禁止）。
- 動作中の機能（window.socket, acpScripts, 引数順序等）を利用する。既存API/シグネチャは保持。

## 発火条件と対象
- 発火: 投稿（Post）またはトピック（Topic）の編集完了イベントを受け取った場合。
- 対象: 編集により本文/タイトルが差分ありと検出された対象のみ再翻訳。
- 言語: 既存設定の対象ロケール（例: 20言語）に対して再翻訳。

## エラーハンドリング
- 設定不足/取得失敗や翻訳API失敗時はエラーとして記録し、フォールバックでの擬似成功は行わない。

## インタフェース（コードは宣言のみ・英語）

```ts
// Types used by auto-translate re-translate-on-edit feature
export type Locale = string; // e.g., "ja", "en-US"

export interface PostEditEvent {
  postId: number;
  topicId: number;
  editorUid: number;
  previousTitle?: string;
  previousRawContent?: string;
  currentTitle: string;
  currentRawContent: string;
}

export interface TranslateJobResult {
  postId: number;
  locales: Locale[];
}

export interface AutoTranslateSettings {
  locales: Locale[]; // target locales
  systemPrompt: string; // must be present
  userPromptTemplate: string; // must be present
}

export interface AutoTranslateService {
  loadSettings(): Promise<AutoTranslateSettings>;
  getTargetLocales(settings: AutoTranslateSettings): Locale[];
  hasMeaningfulDiff(event: PostEditEvent): boolean;
  retranslatePost(event: PostEditEvent, locales: Locale[]): Promise<TranslateJobResult>;
}

export declare function onPostEdited(event: PostEditEvent): Promise<void>;
```

## 受け入れ基準
- 投稿/タイトルを編集して保存すると、対象ロケールの翻訳が再生成されること。
- 設定が欠落している場合は明示的なエラーとして失敗し、フォールバックしないこと。
- 既存の未編集投稿や無関係処理に影響を与えないこと（デグレなし）。

## 備考
- 実装時は NodeBB の該当フックを参照して正しく購読すること。
- 設定キー/翻訳キーは既存仕様を踏襲し、ネスト禁止・フラット構造を厳守する。
