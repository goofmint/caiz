# ツール定義の雛形

## 概要
MCPサーバーで使用可能なツールの定義フレームワークを実装する。`tools/list`リクエストに対して利用可能なツール一覧を返し、各ツールのインプットスキーマと説明を提供する。

## 実装対象

### 1. ツール定義インターフェース

#### ToolDefinition型
```ts
interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: JSONSchema7 & {
        type: 'object';
        properties: Record<string, JSONSchema7Definition>;
        required?: string[];
        additionalProperties?: boolean;
    };
}
```

#### SchemaProperty型
```ts
import type { JSONSchema7, JSONSchema7Definition as SchemaProperty } from 'json-schema';
// Prefer using JSONSchema7/SchemaProperty directly throughout the document.
```

### 2. ツールレジストリー

#### ツール登録・管理システム
```ts
class ToolRegistry {
    constructor() {
        // ツールの内部登録ストレージ
    }

    registerTool(definition: ToolDefinition) {
        // ツール定義をレジストリーに登録
        // 重複チェック、バリデーション実行
    }

    getToolsList(options?: { include_remote?: boolean; include_hidden?: boolean }) {
        // 登録されたすべてのツール定義を返却
        // tools/listリクエスト用の形式で整形
    }

    getTool(name: string) {
        // 指定された名前のツール定義を取得
        // tools/callリクエスト時の検証用
    }
}
```

### 3. 基本ツール定義

#### searchツール
```ts
const searchTool: ToolDefinition = {
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
```ts
const readTool: ToolDefinition = {
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
```ts
import Ajv from 'ajv';
const ajv = new Ajv({ strict: true, allErrors: true });

function validateToolDefinition(def: ToolDefinition): void {
  if (!/^[a-z][a-z0-9._-]{2,63}$/.test(def.name)) throw new Error('invalid name');
  if (!def.description.trim()) throw new Error('empty description');
  if (def.inputSchema.type !== 'object') throw new Error('inputSchema.type must be object');
  const required = def.inputSchema.required ?? [];
  for (const k of required) {
    if (!def.inputSchema.properties?.[k]) throw new Error(`missing required property schema: ${k}`);
  }
  // compile once to ensure schema validity
  ajv.compile(def.inputSchema);
}
```

#### 入力値検証
```ts
function validateToolInput(toolName: string, input: any): boolean {
    // 指定されたツールのinputSchemaに対して入力値を検証
    // JSON Schema仕様に従った厳密なバリデーション
    // エラー時は詳細なエラーメッセージを返却
    const tool = getToolRegistry().getTool(toolName);
    if (!tool) throw new Error(`Tool '${toolName}' not found`);
    const validate = ajv.compile(tool.inputSchema);
    const valid = validate(input);
    if (!valid) throw new Error(ajv.errorsText(validate.errors));
    return valid;
}
```

### 5. tools/listハンドラー統合

#### handleToolsList更新
```ts
// JSON-RPC 2.0 method "tools/list"
function handleToolsList(
    params: { include_remote?: boolean; include_hidden?: boolean },
    req: Request
) {
    // Default flags
    const { include_remote = false, include_hidden = false } = params;
    // Fetch tools with optional filtering
    const tools = getToolRegistry().getToolsList({ include_remote, include_hidden });

    // Build JSON-RPC result payload
    const result = {
        tools: tools.map(t => ({
            id: t.id,
            name: t.name,
            purpose: t.purpose,
            schema: t.inputSchema,        // include raw inputSchema
            location: t.location,         // { type: 'local'|'remote', url? }
            hidden: t.hidden ?? false,
            version: t.version,
        })),
        total: tools.length,            // optional total count
    };

    // JSON-RPC infrastructure will wrap this object under "result"
    return result;
}
```

## 注意事項

- JSON Schema Draft 7準拠のスキーマ定義
- ツール名の一意性保証
- inputSchemaの厳密なバリデーション
- 拡張可能なアーキテクチャ設計
- パフォーマンスを考慮したツール検索