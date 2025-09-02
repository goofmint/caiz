# コミュニティ参加ルール同意（設計ドキュメント）

## 背景
- コミュニティ参加時に独自の規約への同意を求めたい。
- 規約はMarkdownで記述可能とし、更新（改訂）時は再同意が必須。

## 目的 / スコープ
- 目的: 参加（フォロー/メンバー化）直前にルールを提示し、同意がなければ参加を拒否する。
- スコープ:
  - 参加ルール（Markdown）の保存・取得
  - 参加ルールの多言語化・保存
  - ルール変更時のバージョニングと再同意の判定
    - 規約文自体のバージョニングも必要
  - 同意フローの表示と、同意の永続化（多言語対応）
  - 既存の `window.socket` / `acpScripts` の変更

## 同意要件
- コミュニティごとに参加ルールを持てる。
  - オーナーのみ設定・編集が可能。
- ルールはMarkdown文字列で保存。
  - コミュニティ編集モーダルに追加
- ルールが変更（新バージョン）された場合、既存メンバーは再同意が完了するまで「メンバーとしての操作」がブロックされる（閲覧は可能）。
  - メンバーがコミュニティ内のコンテンツを表示した際に、同意モーダルを表示する
- フォールバック禁止（設定が無い場合は同意フローを出さない＝「規約なし」を明示）。

## データモデル（インタフェースのみ / 英語）

バージョンおよび履歴の要件:
- version は SemVer もしくは単調増加（monotonic increasing）な文字列を必須とし、更新（以前のバージョンと文字列が異なる場合）のたびに厳密に増加させる。
- すべての編集は履歴配列（append-only）に追記保存する。履歴は不変（immutable）であり、削除・改変は禁止。
- 最新（現在）の内容は独立したキーで保持し、履歴は過去バージョンのみを蓄積する。
- 各履歴エントリには `updatedAt`（UNIX ms）と `updatedBy`（編集者の uid）を必ず含め、法的/監査上のトレーサビリティを担保する。

```ts
// Community participation rule (stored per community)
export interface CommunityConsentRule {
  cid: number;            // community id
  version: string;        // SemVer or strictly monotonic increasing string (must increase on each update)
  markdown: string;       // current rule content in Markdown (latest only)
  updatedAt: number;      // unix ms (of current content)
  updatedBy: number;      // uid of editor (of current content)
  history: CommunityConsentRuleHistoryEntry[]; // append-only, past versions only
}

// Append-only history entry (immutable)
export interface CommunityConsentRuleHistoryEntry {
  version: string;     // previous version id (SemVer or monotonic string)
  markdown: string;    // previous content snapshot
  updatedAt: number;   // unix ms
  updatedBy: number;   // uid of editor
}

// User consent state per community
export interface CommunityConsentState {
  cid: number;            // community id
  uid: number;            // user id
  version: string;        // consented rule version
  consentedAt: number;    // unix ms
}

// Aggregate to render consent prompt
export interface ConsentPromptModel {
  rule: Pick<CommunityConsentRule, 'cid' | 'version' | 'markdown'>;
  userState?: CommunityConsentState; // undefined if no prior consent
}

// Service contracts (no implementation)
export declare function getConsentRule(cid: number): Promise<CommunityConsentRule | null>;
export declare function setConsentRule(rule: CommunityConsentRule): Promise<void>;
export declare function getUserConsent(uid: number, cid: number): Promise<CommunityConsentState | null>;
export declare function setUserConsent(state: CommunityConsentState): Promise<void>;

// Decision helpers
export declare function needsConsent(params: { uid: number; cid: number; current?: CommunityConsentRule | null; user?: CommunityConsentState | null; }): boolean;
export declare function buildConsentPromptModel(params: { rule: CommunityConsentRule; user?: CommunityConsentState | null; }): ConsentPromptModel;
```

## 振る舞い
- 参加前チェック: `needsConsent` が true の場合のみ同意UIを表示。
- 再同意: `user.version !== rule.version` の場合に true。
  - ルールはコミュニティ単位なので注意
- ルール未設定: `getConsentRule` が `null` の場合は同意不要（フォールバックではない、仕様上の「規約なし」）。
- 保存時検証: バージョンは自動的にインクリメント。Markdownは必須。

## UI/UX（概略）
- 参加ボタン押下時にモーダルを表示し、Markdownをレンダリングして同意チェック + 同意ボタンを設置。
  - チェックを付けたらボタンが有効化。サーバー側でのチェックがついていることを確認。
- 同意後に参加（メンバー化）API/Socketを呼ぶ。拒否は参加処理を中断。
- 既存メンバーで再同意が必要な場合、閲覧時にモーダルを表示。

## 非機能/制約
- 最小変更・既存機能のデグレ禁止。
- ハードコーディング禁止（バージョン・文言は設定/翻訳経由）。
- NodeBB i18nルール（フラットキー、`[[namespace:key]]`）。
