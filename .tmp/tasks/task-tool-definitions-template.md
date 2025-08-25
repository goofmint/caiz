# ツール定義の雛形

## 概要
MCPサーバーで使用可能なツールの定義フレームワークを実装する。`tools/list`リクエストに対して利用可能なツール一覧を返し、各ツールのインプットスキーマと説明を提供する。

## 実装対象

### 1. ツール定義インターフェース

#### ToolDefinition型
```javascript
interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, SchemaProperty>;
        required?: string[];
        additionalProperties?: boolean;
    };
}
```

#### SchemaProperty型
```javascript
interface SchemaProperty {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    enum?: any[];
    items?: SchemaProperty;
    properties?: Record<string, SchemaProperty>;
}
```

### 2. ツールレジストリー

#### ツール登録・管理システム
```javascript
class ToolRegistry {
    constructor() {
        // ツールの内部登録ストレージ
    }

    registerTool(definition) {
        // ツール定義をレジストリーに登録
        // 重複チェック、バリデーション実行
    }

    getToolsList() {
        // 登録されたすべてのツール定義を返却
        // tools/listリクエスト用の形式で整形
    }

    getTool(name) {
        // 指定された名前のツール定義を取得
        // tools/callリクエスト時の検証用
    }
}
```

### 3. 基本ツール定義

#### searchツール
```javascript
const searchTool = {
    name: 'search',
    description: 'Search NodeBB content including topics, posts, and users',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query string'
            },
            category: {
                type: 'string',
                description: 'Optional category to limit search scope',
                enum: ['topics', 'posts', 'users']
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 20)'
            }
        },
        required: ['query'],
        additionalProperties: false
    }
};
```

#### readツール
```javascript
const readTool = {
    name: 'read',
    description: 'Read specific NodeBB content by ID',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                description: 'Type of content to read',
                enum: ['topic', 'post', 'user', 'category']
            },
            id: {
                type: 'string',
                description: 'Unique identifier of the content'
            }
        },
        required: ['type', 'id'],
        additionalProperties: false
    }
};
```

### 4. ツール定義バリデーション

#### スキーマ検証
```javascript
function validateToolDefinition(definition) {
    // name: 非空文字列、英数字とハイフンのみ
    // description: 非空文字列
    // inputSchema: 有効なJSON Schemaオブジェクト
    // required配列の各要素がpropertiesに存在することを確認
}
```

#### 入力値検証
```javascript
function validateToolInput(toolName, input) {
    // 指定されたツールのinputSchemaに対して入力値を検証
    // JSON Schema仕様に従った厳密なバリデーション
    // エラー時は詳細なエラーメッセージを返却
}
```

### 5. tools/listハンドラー統合

#### handleToolsList更新
```javascript
function handleToolsList(params, req) {
    const toolRegistry = getToolRegistry();
    const tools = toolRegistry.getToolsList();
    
    return {
        tools: tools
    };
}
```

## 注意事項

- JSON Schema Draft 7準拠のスキーマ定義
- ツール名の一意性保証
- inputSchemaの厳密なバリデーション
- 拡張可能なアーキテクチャ設計
- パフォーマンスを考慮したツール検索