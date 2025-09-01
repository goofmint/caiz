## 44: 追加レンダリング（Mermaid; 新規プラグイン）

- [ ] Mermaid 記法のレンダリングを新しい NodeBB プラグインとして追加する

### 目的

コードブロックや短コードに書かれた Mermaid 記法をサーバ/クライアントの適切な段階で描画し、XSS・DoSを防ぎつつ、すべてのビュー（トピック・プレビュー・検索結果サマリー等）で一貫して表示できるようにする。

### 要件

- プラグインは独立（例: `nodebb-plugin-extra-renderer`）
  - 将来的に、他のレンダリングも追加される（PlantUMLなど）
- フォールバック禁止（入力が不正・サイズ超過・タイムアウト等は明示的にエラー化/置換）
- SSR/CSRのどちらでも破綻しない設計（サーバ側でサニタイズ、クライアント側で最終描画）
- 既存 Markdown パイプラインに非侵襲に組み込む（フック経由）
- セキュリティ
  - script/style のインライン挿入を禁止
  - 入力長・グラフサイズ・レンダリング時間の制限

### インタフェース（仕様のみ／実装なし）

```ts
// Plugin settings (admin)
export interface MermaidSettings {
  enabled: boolean;           // toggle
  maxInputChars: number;      // input size limit per block
  theme: 'default'|'dark'|'neutral';
  securityLevel: 'strict'|'loose';
  renderTimeoutMs: number;    // client-side render watchdog
}

// Detection result for one code block
export interface MermaidBlock {
  lang: string;           // e.g., "mermaid"
  code: string;           // raw code inside the block
  placeholderId: string;  // unique id for client to hydrate
}

// Server-side parser hook payload (NodeBB shape; simplified)
export interface ParsePostPayload {
  postData: { pid?: number; content: string };
  options?: { isPreview?: boolean };
}

// Server-side: extract and replace code blocks with safe placeholders
export interface MermaidServer {
  parse(content: string, settings: MermaidSettings): { html: string; blocks: MermaidBlock[] };
  sanitize(code: string, settings: MermaidSettings): string; // throws on invalid/too large
}

// Client-side renderer (lazy)
export interface MermaidClient {
  init(settings: MermaidSettings): Promise<void>;
  hydrate(blocks: MermaidBlock[]): Promise<void>; // find placeholders and render SVG into them
}

// Hooks registration (NodeBB plugin lifecycle)
export interface PluginHooks {
  // Parse server-rendered HTML; replace ```mermaid blocks with placeholders
  onFilterParsePost(data: ParsePostPayload): Promise<ParsePostPayload>;

  // Inject client assets and inline boot payload (list of MermaidBlock)
  onFilterMiddlewareRenderHeader(data: any): Promise<any>;
}
```

### フロー（概要）

1. サーバ側: filter:parse.post（相当）で ```mermaid コードブロックを検出→入力長と禁止トークン検査→プレースホルダーに置換
2. ヘッダレンダリング時: プレースホルダー一覧（MermaidBlock[]）を data 属性等で埋め込み
3. クライアント側: 初回ペイント後に `MermaidClient.hydrate` で対象プレースホルダーへSVG描画
4. タイムアウト・エラー時はプレースホルダーへエラー要素を明示表示（フォールバックでの成功偽装はしない）

### 注意事項

- すべての描画は sandboxed DOM で実施（外部スクリプト読み込み/iframe挿入は不可）
- 画像エクスポート等の拡張は本タスク外

