# JSON-RPC 受信の枠

## 概要
MCPサーバーでJSON-RPC 2.0メッセージを受信・検証・処理するためのフレームワークを実装する。`POST /api/mcp` エンドポイントでJSON-RPC形式のメッセージを受信し、基本的なバリデーションと応答処理を行う。

## 実装対象

### 1. JSON-RPC 2.0メッセージ受信エンドポイント

#### POST /api/mcp - JSON-RPC Message Processing
```javascript
router.post('/api/mcp', 
    require('../lib/simple-auth').requireAuth(),
    (req, res) => {
        // JSON-RPC 2.0フォーマット検証
        // メッセージタイプ判定（request/notification/batch）
        // メソッド別ルーティング
        // レスポンス構築
    }
);
```

### 2. JSON-RPC フォーマット検証

#### 基本構造検証
```javascript
function validateJsonRpcMessage(message) {
    // jsonrpc: "2.0" 必須チェック
    // method: string 必須チェック  
    // id: 存在確認（request時は必須、notification時はundefined）
    // params: オプショナル、存在時は object または array
    return { isValid: boolean, error?: object };
}
```

#### バッチリクエスト対応
```javascript
function processBatchRequest(messages) {
    // 配列形式の複数メッセージ処理
    // 各メッセージの個別バリデーション
    // レスポンス配列の構築
    // 全通知の場合は202 Accepted返却
}
```

### 3. メッセージタイプ別処理

#### リクエストメッセージ（idあり）
```javascript
function processRequest(message, req) {
    // メソッド名によるルーティング
    // パラメータ抽出と検証
    // ビジネスロジック実行
    // JSON-RPC Success/Error レスポンス構築
    return {
        jsonrpc: "2.0",
        result: result || null,
        id: message.id
    };
}
```

#### 通知メッセージ（idなし）
```javascript
function processNotification(message, req) {
    // メソッド名によるルーティング
    // 副作用処理の実行
    // レスポンスは返却しない
}
```

### 4. エラーハンドリング

#### JSON-RPC エラーコード
```javascript
const JSON_RPC_ERRORS = {
    PARSE_ERROR: -32700,      // JSON解析エラー
    INVALID_REQUEST: -32600,  // 無効なリクエスト
    METHOD_NOT_FOUND: -32601, // メソッド不明
    INVALID_PARAMS: -32602,   // 無効なパラメータ
    INTERNAL_ERROR: -32603    // サーバー内部エラー
};
```

#### エラーレスポンス構築
```javascript
function buildErrorResponse(code, message, data, id) {
    return {
        jsonrpc: "2.0",
        error: {
            code: code,
            message: message,
            data: data // オプショナル
        },
        id: id || null
    };
}
```

### 5. サポートするMCPメソッド（初期実装）

#### initialize メソッド
```javascript
function handleInitialize(params, req) {
    return {
        protocolVersion: "2024-11-05",
        capabilities: {
            tools: {},
            prompts: {},
            resources: {},
            logging: {}
        },
        serverInfo: {
            name: "NodeBB MCP Server",
            version: pluginVersion
        }
    };
}
```

#### tools/list メソッド
```javascript
function handleToolsList(params, req) {
    return {
        tools: [
            {
                name: "search",
                description: "Search NodeBB content",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query"
                        }
                    },
                    required: ["query"]
                }
            }
        ]
    };
}
```

### 6. コンテンツタイプとヘッダー検証

#### Accept ヘッダー検証
```javascript
function validateHeaders(req) {
    // Accept: application/json または text/event-stream の確認
    // Content-Type: application/json の確認（POST時）
    // 無効な場合は400 Bad Request
}
```

#### セキュリティヘッダー
```javascript
const securityHeaders = {
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
};
```

### 7. 認証統合

#### Bearer トークン認証
- `simple-auth.js`の`requireAuth()`ミドルウェアを使用
- 認証情報を`req.auth`で取得
- 認証失敗時は401レスポンス

## 注意事項

- JSON-RPC 2.0仕様に完全準拠
- 既存のSSE機能との共存
- パフォーマンスを考慮したメッセージ処理
- ログ記録とエラー監視
- レート制限は別タスクで実装予定