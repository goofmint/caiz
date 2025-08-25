# SSE 最小実装

## 概要
MCPサーバーでServer-Sent Events (SSE) を使用したリアルタイム通信の最小実装を行う。`GET /api/mcp` エンドポイントで `text/event-stream` を開始し、定期的なハートビートを送信する。

## 実装対象

### 1. SSEエンドポイントの拡張

#### GET /api/mcp - Server-Sent Events
```javascript
router.get('/api/mcp', 
    require('../lib/simple-auth').requireAuth(),
    (req, res) => {
        // Accept ヘッダーで text/event-stream を確認
        // SSE ヘッダーを設定
        // 初期接続通知を送信
        // ハートビートタイマーを開始
        // クライアント切断時のクリーンアップ
    }
);
```

#### SSEヘッダーの設定
```javascript
const sseHeaders = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    // For same-origin cookie auth, omit ACAO entirely.
    // If cross-origin is required, echo the Origin and add:
    // 'Access-Control-Allow-Origin': req.headers.origin,
    // 'Vary': 'Origin',
    // 'Access-Control-Allow-Credentials': 'true',
    // 'Access-Control-Allow-Headers': 'Content-Type',
    'X-Accel-Buffering': 'no'  // nginx でのバッファリング無効化
};
```

**認証モデル**: 標準的なEventSourceはAuthorizationヘッダーを送信できないため、same-originでのcookie認証または専用のクエリパラメータ経由のセッショントークンを使用します。

### 2. ハートビート機能

#### 定期ハートビート送信
```javascript
function startHeartbeat(res) {
    const intervalMs = 15000; // プロキシ考慮で短め
    return setInterval(() => {
        // 方式A: SSEコメント（最小オーバーヘッド）
        // res.write(`: keep-alive ${Date.now()}\n\n`);
        // 方式B: JSON-RPC通知を data として送る
        const payload = {
            jsonrpc: '2.0',
            method: 'notifications/ping',
            params: { 
                timestamp: new Date().toISOString(), 
                server: 'NodeBB MCP Server' 
            }
        };
        res.write(`event: ping\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }, intervalMs);
}
```

### 3. 接続管理

#### 初期接続通知
```javascript
const initNotification = {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {
        protocolVersion: '2024-11-05',
        serverInfo: {
            name: 'NodeBB MCP Server',
            version: pluginVersion
        },
        capabilities: {
            tools: {},
            prompts: {},
            resources: {},
            logging: {}
        }
    }
};
```

#### クライアント切断処理
```javascript
const teardown = () => {
    clearInterval(heartbeatTimer);
    connections.delete(connId);
    // 追加のリソース解放やログ
    winston.verbose(`[mcp-server] SSE connection closed: ${connId}`);
};

req.on('close', teardown);
req.on('aborted', teardown);
```

### 4. エラーハンドリング

#### Accept ヘッダー検証
- `text/event-stream` が含まれていない場合は 405 Method Not Allowed を返却
- `Allow: POST` ヘッダーを含める

#### 認証エラー
- 通常の401認証エラー処理を継続
- WWW-Authenticate ヘッダーを含む

### 5. セキュリティ考慮事項

#### リソース制限
- 同時接続数の制限（デフォルト: 100接続）
- ユーザーあたりの接続数制限（デフォルト: 5接続）
- ハートビート間隔の調整可能化

#### タイムアウト処理
- 長時間の無応答接続の検出
- 自動切断とリソース解放
- 適切なクリーンアップ処理

## 注意事項

- 既存の POST /api/mcp エンドポイントとの共存
- nginx や他のリバースプロキシでのSSE対応設定が必要
- クライアント側でのReconnection処理は将来実装
- エラー通知機能は別タスクで実装予定
- メッセージの永続化や配信保証は対象外