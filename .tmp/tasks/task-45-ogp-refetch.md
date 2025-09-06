# タスク45: OGP再取得機能（スレッド単位・1分間制限）

## 概要

スレッド（トピック）単位でOGPメタデータの再取得を要求できる機能の設計ドキュメント。ユーザー操作により対象スレッド内の全OGP対象URLについて再取得を行う。短時間の連打や負荷増大を防ぐため、同一スレッドに対する再取得要求は1分間は不可とする（レート制限）。

- 実装は未着手。本書はインタフェース定義と振る舞いの説明のみ。
- 通信は既存方針どおりWebSocketを使用（window.socketは既存のまま）。
- NodeBB i18nはフラットキー運用（例はキー名のみを提示し、実装は別途）。

## スコープ

- 対象: トピック（thread/topic）1件に対するOGP再取得要求
- 非対象: OGP埋め込みロジックの変更、UI詳細デザイン、永続化方式の実装

## 期待される動作

- 許可された利用者がスレッドで「OGP再取得」を実行すると、対象スレッド内のOGP対象URLが再取得キューに投入される。
- 同一スレッドに対する再取得要求は、最後の受理から60秒間は拒否する。
- レート制限超過時はエラーを返し、翻訳キーでメッセージ表示。

## インタフェース定義（コードは宣言のみ）

```ts
// 基本型
export type TopicId = number;
export type UserId = number;

export type OgpRefetchErrorCode =
  | 'RATE_LIMITED'
  | 'NOT_AUTHENTICATED'
  | 'NOT_AUTHORIZED'
  | 'TOPIC_NOT_FOUND'
  | 'INTERNAL_ERROR';

export interface ErrorPayload {
  code: OgpRefetchErrorCode;
  message: string; // i18n済みテキストを期待
}

// 要求ペイロード
export interface OgpRefetchRequest {
  topicId: TopicId;
}

// 成功応答
export interface OgpRefetchAccepted {
  accepted: true;
  topicId: TopicId;
  // 次に再取得可能になるUNIXエポック（ミリ秒）
  nextAllowedAt: number;
}

// 失敗応答
export interface OgpRefetchRejected {
  accepted: false;
  error: ErrorPayload;
}

export type OgpRefetchResponse = OgpRefetchAccepted | OgpRefetchRejected;

// ソケットイベントのセマンティクス
export interface OgpRefetchSocket {
  // Client -> Server: 再取得要求
  emit(
    event: 'ogp:refetch',
    payload: OgpRefetchRequest,
    callback: (res: OgpRefetchResponse) => void,
  ): void;
}

// レート制限判定（1分）
export interface OgpRefetchLimiter {
  // 現在時刻（ms）を引数で受け、判定のみを行う
  isAllowed(topicId: TopicId, userId: UserId, now: number): boolean;
  // 許可された場合に記録
  note(topicId: TopicId, userId: UserId, now: number): void;
  // 次に許可される時刻（ms）。未登録ならnowを返す実装を想定
  nextAllowedAt(topicId: TopicId, userId: UserId, now: number): number;
}

// 権限確認
export interface OgpRefetchPermission {
  // ユーザーが対象スレッドで再取得を要求できるかの論理
  canRequest(userId: UserId, topicId: TopicId): Promise<boolean>;
}

// 再取得キュー投入（非同期実行）
export interface OgpRefetchQueue {
  enqueue(topicId: TopicId): Promise<void>;
}
```

## i18nキー（例・フラット構造）

- `[[caiz:ogp-refetch]]`
- `[[caiz:ogp-refetch-accepted]]`
- `[[caiz:ogp-refetch-rate-limited]]`
- `[[caiz:ogp-refetch-not-authorized]]`
- `[[caiz:ogp-refetch-topic-not-found]]`
- `[[caiz:ogp-refetch-internal-error]]`

注: 実装時は `languages/ja/caiz.json`, `en-US/caiz.json`, `en-GB/caiz.json` に同一キーをフラットで定義すること。`app.parseAndTranslate()` はテンプレート用であり、単一キー翻訳には `translator.translate()` を用いる（設計時の注意のみ、実装は本タスク範囲外）。

## エラーハンドリング方針

- レート制限超過: `RATE_LIMITED` を返却。UIは `ogp-refetch-rate-limited` を翻訳表示。
- 未認証/未権限: `NOT_AUTHENTICATED` / `NOT_AUTHORIZED`。
- スレッド未検出: `TOPIC_NOT_FOUND`。
- 予期せぬ失敗: `INTERNAL_ERROR`。

## セキュリティと制約

- 認可は最小権限原則。投稿者またはモデレーター等、プロジェクト定義に依存（本ドキュメントでは仕様固定しない）。
- リクエストはWebSocket経由、既存の `window.socket` を前提にイベント名で識別（新規のイベント名のみ定義）。
- 1分間ルールはサーバー側判定が正とし、クライアント側では補助的に次回可能時刻の表示のみ行う。

## 同時実行と負荷

- 同一スレッドの重複実行はキュー側でデデュープする前提のインタフェース定義（実装は別タスク）。
- 最大同時処理数はプラグイン設定に依存（ここでは仕様を固定しない）。

