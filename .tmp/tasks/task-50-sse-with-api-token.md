# 50: APIトークンによるSSE接続

- [ ] ドキュメントレビュー完了（レビュー後に実装着手）

## 概要
- 目的: APIトークン（ユーザーが発行したPersonal Access Token等）を用いて、`GET /api/mcp` のSSE接続を確立できるようにする。
- 対象: `nodebb-plugin-mcp-server`（実装は本PRでは行わない）。
- 範囲: 認可ヘッダの受理、トークン検証、ユーザー識別、SSE開始までの認可フロー。UI変更やトークン発行機能の拡張は対象外。

## 要件
- 認証方式: `Authorization: Bearer <api_token>` を受理し、既存のBearer/OAuth2と共存。
- 同一ユーザー識別: 検証後に `uid`, `scopes`, `tokenId` 等をSSEコンテキストへ設定。
- フォールバック禁止: トークン欠落・不正・期限切れ・権限不足は明確に401/403を返す（擬似成功なし）。
- ヘッダ: `text/event-stream`, `Cache-Control: no-store`, `Connection: keep-alive` 等は既存方針に準拠。

## インタフェース（英語／宣言のみ）
```ts
export interface SseAuthContext {
  uid: number;
  tokenId?: string;
  scopes: string[];
}

export interface ApiTokenInfo {
  uid: number;
  tokenId: string;
  scopes: string[];
  active: boolean;
  expiresAt?: number; // epoch ms
}

export interface ApiTokenValidator {
  // Validate bearer token string and return token info
  validate(token: string): Promise<ApiTokenInfo>;
}

export interface SseAuthorizer {
  // Build auth context from request (supports API token + OAuth2)
  authorize(req: import('http').IncomingMessage): Promise<SseAuthContext>;
}

export interface SseConnection {
  // Start SSE stream for authorized user context
  start(res: import('http').ServerResponse, ctx: SseAuthContext): void;
}
```

## 受け入れ基準
- 有効なAPIトークンを持つユーザーが、`Authorization: Bearer` で `GET /api/mcp` に接続しSSEを受信できること。
- 無効・失効・権限不足のトークンでは401/403で接続が拒否されること。
- 既存のBearer/OAuth2フローを破壊せず共存できること（デグレなし）。

## 備考
- 実装時は既存の簡易認証レイヤーにAPIトークン検証を組み込み、分岐のみで構成する（関数シグネチャは変更しない）。
- ログには `uid`, `tokenId`（あれば）を含め、監査可能性を確保する。
