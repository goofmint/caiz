# MCP over HTTP 仕様書

## 概要

Model Context Protocol (MCP) over HTTP の2025年版仕様に基づく実装要件書

**参考**: [MCP Specification 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)

---

## 基本要件

### エンドポイント構造
- **単一HTTPエンドポイント**が必要
- 例: `https://example.com/mcp`
- POSTとGETの両方のメソッドをサポート

### JSON-RPC 2.0準拠
- 全てのメッセージはJSON-RPC 2.0仕様に従う
- UTF-8エンコーディング必須

---

## HTTP POST Method（JSON-RPCメッセージ）

### 用途
JSON-RPCリクエスト、通知、レスポンスの送信

### リクエスト要件

#### 必須ヘッダー
```http
POST /mcp HTTP/1.1
Accept: application/json, text/event-stream
Content-Type: application/json
```

#### リクエストボディ
以下のいずれかの形式：
1. **単一JSON-RPCメッセージ**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "Claude Desktop",
      "version": "1.0.0"
    }
  }
}
```

2. **バッチリクエスト**（複数メッセージ）
```json
[
  {
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/list"
  },
  {
    "jsonrpc": "2.0",
    "id": "2", 
    "method": "resources/list"
  }
]
```

### レスポンス要件

#### 成功時（レスポンスが不要な場合）
```http
HTTP/1.1 202 Accepted
Content-Length: 0
```

#### 成功時（レスポンスが必要な場合）
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {},
      "logging": {}
    },
    "serverInfo": {
      "name": "NodeBB MCP Server",
      "version": "1.0.0"
    }
  }
}
```

#### エラー時
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "1",
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

---

## HTTP GET Method（Server-Sent Events）

### 用途
サーバーからクライアントへのリアルタイム通信

### リクエスト要件

#### 必須ヘッダー
```http
GET /mcp HTTP/1.1
Accept: text/event-stream
Cache-Control: no-cache
```

### レスポンス要件

#### SSE対応サーバーの場合
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}

data: {"jsonrpc": "2.0", "method": "notifications/progress", "params": {"progressId": "1", "progress": 0.5}}

```

#### SSE非対応サーバーの場合
```http
HTTP/1.1 405 Method Not Allowed
Allow: POST
```

---

## 標準JSON-RPCメソッド

### 必須メソッド

#### initialize
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {}
    },
    "clientInfo": {
      "name": "Client Name",
      "version": "1.0.0"
    }
  }
}
```

#### tools/list
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/list"
}
```

#### tools/call
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "example query"
    }
  }
}
```

### オプションメソッド

#### resources/list
```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "method": "resources/list"
}
```

#### prompts/list
```json
{
  "jsonrpc": "2.0",
  "id": "5",
  "method": "prompts/list"
}
```

---

## セキュリティ要件

### 認証
- OAuth 2.0 Bearer Token認証推奨
- `Authorization: Bearer <token>`ヘッダー

### CORS
- `Origin`ヘッダーの検証
- 適切なCORSヘッダーの設定

### その他
- HTTPS通信必須（本番環境）
- ローカルホスト接続時は可能な限りlocalhostにバインド

---

## セッション管理（オプション）

### セッションIDヘッダー
```http
Mcp-Session-Id: session_12345
```

### セッション継続
- 複数リクエスト間での状態維持
- セッションタイムアウト処理

---

## エラーコード仕様

### JSON-RPC標準エラー
- `-32700`: Parse error
- `-32600`: Invalid Request  
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

### MCP固有エラー
- `-32000`: Server error
- `-32001`: Unknown method
- `-32002`: Invalid params

---

## 実装チェックリスト

### 必須実装
- [ ] POST `/mcp` エンドポイント
- [ ] JSON-RPC 2.0 パーサー  
- [ ] `initialize` メソッド
- [ ] `tools/list` メソッド
- [ ] `tools/call` メソッド
- [ ] 適切なHTTPステータスコード
- [ ] エラーハンドリング

### オプション実装
- [ ] GET `/mcp` エンドポイント（SSE）
- [ ] `resources/list` メソッド
- [ ] `prompts/list` メソッド
- [ ] セッション管理
- [ ] バッチリクエスト対応

### セキュリティ
- [ ] OAuth 2.0認証
- [ ] HTTPS強制
- [ ] CORS設定
- [ ]入力検証

---

## NodeBB実装での注意点

### 現在の問題
- ❌ `/api/mcp/messages` という独自エンドポイント（仕様外）
- ❌ POST `/api/mcp/` 未実装
- ❌ 202 Accepted レスポンス未実装
- ❌ SSE実装が仕様と異なる

### 修正が必要な項目
1. POST `/api/mcp/` の実装
2. 202 Accepted レスポンスの実装
3. GET `/api/mcp/` のSSE対応
4. `/api/mcp/messages` の削除
5. JSON-RPC 2.0準拠の実装

---

## 参考リンク

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)