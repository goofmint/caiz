# タスク46: 規約モーダルの表示トリガー修正（Join操作時のみ表示）

## 概要

コミュニティ閲覧時に規約（同意）モーダルが自動表示されてしまう不具合を解消する。モーダルは「Become member（メンバーになる）」操作時にのみ表示するのが正しい仕様。閲覧時やページロード時の自動表示は行わない。

- 実装は行わない。本ドキュメントはインタフェース定義と期待挙動の合意のみ。
- 既存の `window.CaizConsent`（クライアント）と `plugins.caiz.*`（サーバソケット）の設計を踏まえ、トリガー条件の整理を行う。
- NodeBB i18nはフラットキーのみを使用（例示はキー名のみ、実装は別途）。

## 不具合の現象

- ログイン済み利用者がコミュニティページを表示しただけで規約モーダルが開く。
- 期待挙動は「Join（Become member）ボタンを押した時」にのみモーダルが開くこと。

## 期待される挙動

1. ページロード（コミュニティ表示）時に規約モーダルを自動表示しない。
2. Join（Become member）操作時にのみ、規約モーダルを表示する。
3. 規約に同意した場合のみ、Join処理を継続する。
4. 同意済みの利用者がJoin操作を行った場合は、モーダルを出さずにJoin処理へ直行する。

## クライアント側インタフェース（宣言のみ）

```ts
// Joinフローのエントリポイント（UIボタンが呼び出す）
export function onJoinButtonClicked(params: { cid: number; locale: string }): void;

// 規約モーダルの表示と同意の取得
export namespace CaizConsentUI {
  // 同意が必要ならモーダルを表示し、結果を返す
  // 成功: { status: 'agreed' } / キャンセル: { status: 'cancelled' }
  export function requestConsentIfRequired(
    cid: number,
    locale: string
  ): Promise<{ status: 'agreed' | 'cancelled' }>;
}

// 同意要否の確認（サーバと通信）
export function checkConsent(params: { cid: number }): Promise<{
  required: boolean;
  version?: string;                 // サーバの現行規約版
  alreadyConsentedVersion?: string; // ユーザーが既に同意済の版
  reason?: 'first' | 'updated';     // 初回/改定再同意の区別（UI表示に活用）
}>; // socket: plugins.caiz.checkConsent

// 同意確定の送信（サーバと通信）
export function setUserConsent(params: { cid: number; version: string }): Promise<{ ok: boolean }>; // socket: plugins.caiz.setUserConsent

// Join実行（サーバと通信）
export function joinCommunity(params: { cid: number }): Promise<{ ok: boolean }>; // 既存のJoin API/ソケットを利用
```

- 注意事項:
  - ページロード時に `requestConsentIfRequired` を呼ばないこと（自動表示禁止）。
  - Joinボタンのクリックハンドラだけが `requestConsentIfRequired` を呼び出す。
  - `alerts` を用いた通知は、失敗時のみ最小限に表示する（翻訳キーはフラット構造）。

## サーバ側インタフェース（宣言のみ）

```ts
// 既存: 規約の要否を判定して返す
export async function checkConsent(socket: Socket, data: { cid: number }): Promise<{ required: boolean }>; // plugins.caiz.checkConsent

// 既存: 規約への同意を記録する
export async function setUserConsent(socket: Socket, data: { cid: number; version: string }): Promise<{ ok: boolean }>; // plugins.caiz.setUserConsent

// Join実行（既存のメンバー追加ルート/ソケットを利用）
export async function addMember(socket: Socket, data: { cid: number }): Promise<{ ok: boolean }>; // plugins.caiz.addMember 等
```

- 注意事項:
  - `filter:middleware.renderHeader` 等、ページ描画系のフックから規約同意UIを直接起動しない。
  - 既存の同意要否判定は保持するが、クライアントからの明示的リクエスト時のみ呼ばれるようにする（閲覧時は呼ばない）。

## フロー（Join時）

0. 未ログインならログイン導線へ（Joinフロー開始不可）。
1. ユーザーが Join（Become member）ボタンをクリック。
2. クライアント `checkConsent({ cid })` を呼び、`required` を取得。
3. `required === true` の場合、`CaizConsentUI.requestConsentIfRequired(cid, locale)` がモーダルを表示。
   - 同意: `setUserConsent({ cid, version })` を送信して続行。
   - キャンセル: 何もせず終了（アラートは出さない）。
4. 同意完了後、`joinCommunity({ cid })` を実行。
5. `required === false` の場合は、3をスキップして `joinCommunity` を実行。

## 実装ガイドライン（起動トリガーの集中化）

- ページロードや描画フックから規約モーダルを起動しない。
- `members-only.js`、`community-edit-core.js`、`consent-interceptor.js` 等に存在する自動起動パスは排除し、Joinボタンのクリックハンドラのみから `requestConsentIfRequired` を起動する。

## i18nキー（例・フラット構造）

- `[[caiz:consent.required-title]]`
- `[[caiz:consent.required-description]]`
- `[[caiz:consent.agree]]`
- `[[caiz:consent.cancel]]`
- `[[caiz:consent.error.loading]]`
- `[[caiz:consent.error.saving]]`
- `[[caiz:join.success]]`
- `[[caiz:join.error]]`

注: `languages/ja/caiz.json`, `en-US/caiz.json`, `en-GB/caiz.json` でフラット構造を維持。単一キーの翻訳は `translator.translate()` を使用し、テンプレート翻訳と混用しない。

## ログと通知

- ログ: 成功/失敗を `winston`（サーバ）と `console.info/error`（クライアント）で記録。
- 通知: クライアントは `alerts.success/error` のみを使用。失敗時の詳細は翻訳キーで表示。

## 非機能

- 自動表示禁止（閲覧時起動のコードパスを持たない設計）
- 既存のJoin/Consent API互換を維持（関数シグネチャは変更しない）
- フォールバック禁止（設定値や同意バージョンが取得できない場合は明確にエラー）
