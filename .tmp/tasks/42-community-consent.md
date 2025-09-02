# コミュニティ参加ルール同意（設計ドキュメント）

## 背景
- コミュニティ参加時に独自の規約への同意を求めたい。
- 規約はMarkdownで記述可能とし、更新（改訂）時は再同意が必須。

## 目的 / スコープ
- 目的: 参加（フォロー/メンバー化）直前にルールを提示し、同意がなければ参加を拒否する。
- スコープ:
  - 参加ルール（Markdown）の保存・取得
  - ルールのバージョニングと再同意の判定
  - 同意フローの表示と、同意の永続化
- 非スコープ:
  - 実装（本ドキュメントは設計のみ）
  - 既存の `window.socket` / `acpScripts` の変更（禁止）

## 同意要件
- コミュニティごとに参加ルールを持てる。
- ルールはMarkdown文字列で保存。
- ルールが変更（新バージョン）された場合、既存メンバーは再同意が完了するまで「メンバーとしての操作」がブロックされる（閲覧は可とするかは別途仕様化）。
- フォールバック禁止（設定が無い場合は同意フローを出さない＝「規約なし」を明示）。

## データモデル（インタフェースのみ / 英語）

```ts
// Community participation rule (stored per community)
export interface CommunityConsentRule {
  cid: number;            // community id
  version: string;        // semantic or monotonic version string
  markdown: string;       // rule content in Markdown
  updatedAt: number;      // unix ms
  updatedBy: number;      // uid of editor
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
- ルール未設定: `getConsentRule` が `null` の場合は同意不要（フォールバックではない、仕様上の「規約なし」）。
- 保存時検証: バージョンは空文字不可。Markdownは必須。

## UI/UX（概略）
- 参加ボタン押下時にモーダルを表示し、Markdownをレンダリングして同意チェック + 同意ボタンを設置。
- 同意後に参加（メンバー化）API/Socketを呼ぶ。拒否は参加処理を中断。
- 既存メンバーで再同意が必要な場合、該当操作（投稿など）の直前にモーダルを表示。

## 非機能/制約
- 最小変更・既存機能のデグレ禁止。
- ハードコーディング禁止（バージョン・文言は設定/翻訳経由）。
- NodeBB i18nルール（フラットキー、`[[namespace:key]]`）。

