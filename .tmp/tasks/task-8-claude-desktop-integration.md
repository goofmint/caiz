# Task 8: Claude Desktop統合

## 概要

Claude Desktop（Anthropic公式デスクトップアプリ）との統合を実現するため、MCP（Model Context Protocol）サーバーの`mcp-remote`プロトコル対応とOAuth2認証フロー全体のE2Eテスト実装を行います。Claude Desktopが使用する`mcp-remote`経由でのNodeBB MCPサーバーへの接続、認証、データ交換の完全な動作確認を目的とします。

### 対象システム
- **Claude Desktop** - Anthropic公式デスクトップアプリケーション
- **mcp-remote** - Claude Desktopが使用するMCPリモート接続プロトコル
- **NodeBB MCP Server** - 実装したOAuth2対応MCPサーバー

### 統合シナリオ
1. **初回接続**: Claude DesktopからMCPサーバーへの初回アクセス
2. **OAuth2認証**: Device Authorization Grantフローによる認証
3. **データ交換**: 認証済み状態でのMCP通信（tools/list, search等）
4. **エラーハンドリング**: 接続失敗・認証エラー時の適切な処理

## 実装対象

### 1. E2Eテスト自動化フレームワーク (`tests/oauth-flow.js`)

Claude Desktop統合のための包括的なテストスイートを実装します。

#### テストフレームワーク構造
```javascript
/**
 * Claude Desktop Integration E2E Test Suite
 * Tests OAuth2 flow and MCP communication with mcp-remote protocol
 */
class ClaudeDesktopIntegrationTest {
    /**
     * Initialize test environment
     */
    async setup() {
        // Test server startup
        // Mock Claude Desktop client setup
        // OAuth2 flow preparation
    }

    /**
     * Test OAuth2 Device Authorization Grant flow
     */
    async testOAuth2Flow() {
        // 1. Initial connection attempt (401 response)
        // 2. Device authorization request
        // 3. User authentication simulation
        // 4. Token acquisition
        // 5. Authenticated MCP connection
    }

    /**
     * Test MCP protocol communication
     */
    async testMCPCommunication() {
        // tools/list endpoint testing
        // search tool functionality
        // SSE connection stability
        // JSON-RPC message exchange
    }

    /**
     * Test error scenarios and recovery
     */
    async testErrorHandling() {
        // Network failures
        // Token expiration
        // Authentication errors
        // Connection timeouts
    }
}
```

### 2. mcp-remote プロトコル対応検証

Claude Desktopが使用する`mcp-remote`プロトコルとの互換性を確認・修正します。

#### 互換性チェック項目
```javascript
/**
 * mcp-remote Protocol Compatibility Tests
 */
const mcpRemoteCompatibility = {
    /**
     * Check HTTP/SSE endpoint compatibility
     */
    async testEndpointCompatibility() {
        // GET /api/mcp (SSE) - Claude Desktop expects specific headers
        // POST /api/mcp (JSON-RPC) - Message format validation
        // Response format compliance with MCP specification
    },

    /**
     * Verify OAuth2 integration
     */
    async testOAuth2Integration() {
        // 401 response format expected by mcp-remote
        // OAuth2 metadata format compatibility
        // Token usage in subsequent requests
    },

    /**
     * Test connection lifecycle
     */
    async testConnectionLifecycle() {
        // Initial connection establishment
        // Authentication state management
        // Connection persistence and recovery
    }
};
```

### 3. Claude Desktop設定ファイル生成

Claude Desktop用の設定ファイル（`claude_desktop_config.json`）を自動生成します。

#### 設定生成機能
```javascript
/**
 * Generate Claude Desktop configuration for NodeBB MCP Server
 */
class ClaudeDesktopConfigGenerator {
    /**
     * Generate configuration file for Claude Desktop
     * @param {Object} serverConfig - MCP server configuration
     * @returns {Object} Claude Desktop config object
     */
    generateConfig(serverConfig) {
        return {
            "mcpServers": {
                "nodebb-mcp-server": {
                    "command": "npx",
                    "args": [
                        "@anthropic/mcp-server-remote",
                        "--url", serverConfig.baseUrl + "/api/mcp",
                        "--oauth2"
                    ],
                    "env": {
                        "MCP_SERVER_URL": serverConfig.baseUrl,
                        "OAUTH2_CLIENT_ID": "mcp-client"
                    }
                }
            }
        };
    }

    /**
     * Write configuration to file
     */
    async writeConfigFile(config, outputPath) {
        // Write JSON configuration to specified path
        // Validate configuration format
        // Provide setup instructions
    }
}
```

### 4. OAuth2フロー統合テスト

実際のOAuth2認証フローをシミュレーションし、Claude Desktop側の動作を検証します。

#### フローテストシナリオ
```javascript
/**
 * OAuth2 Flow Integration Tests
 */
class OAuth2FlowTest {
    /**
     * Test complete OAuth2 Device Authorization Grant flow
     */
    async testCompleteAuthFlow() {
        // Step 1: Initial MCP connection attempt
        const initialResponse = await this.attemptInitialConnection();
        
        // Step 2: Parse 401 response and OAuth2 metadata
        const oauthMetadata = this.parseAuthMetadata(initialResponse);
        
        // Step 3: Device authorization request
        const deviceAuth = await this.requestDeviceAuthorization(oauthMetadata);
        
        // Step 4: Simulate user authentication
        await this.simulateUserAuth(deviceAuth.user_code);
        
        // Step 5: Token polling and acquisition
        const tokens = await this.pollForTokens(deviceAuth.device_code);
        
        // Step 6: Authenticated MCP connection
        const mcpConnection = await this.establishAuthenticatedConnection(tokens);
        
        // Step 7: Verify MCP functionality
        await this.testMCPOperations(mcpConnection);
    }

    /**
     * Test token refresh flow
     */
    async testTokenRefresh() {
        // Token expiration simulation
        // Refresh token usage
        // Seamless connection maintenance
    }

    /**
     * Test error recovery scenarios
     */
    async testErrorRecovery() {
        // Network interruption recovery
        // Authentication failure handling
        // Automatic retry mechanisms
    }
}
```

## 実装詳細

### テスト実行環境

#### 1. 依存関係
```javascript
// package.json dependencies for testing
{
    "devDependencies": {
        "@anthropic/mcp-server-remote": "latest",
        "axios": "^1.0.0",
        "ws": "^8.0.0",
        "eventsource": "^2.0.0",
        "jest": "^29.0.0"
    }
}
```

#### 2. テスト設定
```javascript
/**
 * Test configuration for Claude Desktop integration
 */
const testConfig = {
    serverUrl: process.env.TEST_SERVER_URL || 'http://localhost:4567',
    mcpEndpoint: '/api/mcp',
    oauthEndpoints: {
        deviceAuth: '/api/oauth/device_authorization',
        token: '/api/oauth/token'
    },
    testTimeout: 30000,
    retryAttempts: 3
};
```

### Claude Desktop互換性確認

#### 1. エンドポイント検証
```javascript
/**
 * Validate MCP endpoint compatibility with Claude Desktop
 */
class EndpointCompatibilityValidator {
    /**
     * Check SSE endpoint headers and format
     */
    async validateSSEEndpoint() {
        // Content-Type: text/event-stream
        // Cache-Control headers
        // CORS headers for desktop app
        // Initial connection handshake
    }

    /**
     * Verify JSON-RPC endpoint format
     */
    async validateJSONRPCEndpoint() {
        // Content-Type: application/json
        // JSON-RPC 2.0 compliance
        // Error response format
        // Authentication header handling
    }

    /**
     * Test OAuth2 response format
     */
    async validateOAuth2Responses() {
        // 401 response structure
        // OAuth2 metadata format
        // Device authorization response
        // Token response format
    }
}
```

#### 2. プロトコル準拠性
```javascript
/**
 * MCP Protocol Compliance Tests
 */
const protocolCompliance = {
    /**
     * Test MCP message format compliance
     */
    testMessageFormat: async () => {
        // JSON-RPC 2.0 message structure
        // Method name conventions
        // Parameter format validation
        // Response structure verification
    },

    /**
     * Test tool discovery and invocation
     */
    testToolDiscovery: async () => {
        // tools/list response format
        // Tool metadata structure
        // Tool invocation parameters
        // Result format compliance
    },

    /**
     * Test server capabilities
     */
    testServerCapabilities: async () => {
        // Capabilities announcement
        // Feature flag support
        // Version compatibility
    }
};
```

## セキュリティとエラーハンドリング

### 1. セキュリティ検証
```javascript
/**
 * Security validation for Claude Desktop integration
 */
class SecurityValidator {
    /**
     * Test OAuth2 security measures
     */
    async validateOAuth2Security() {
        // Token storage security
        // HTTPS enforcement
        // CORS policy compliance
        // Client authentication
    }

    /**
     * Test data protection
     */
    async validateDataProtection() {
        // API response sanitization
        // Error message security
        // Log data protection
    }
}
```

### 2. エラーハンドリング
```javascript
/**
 * Comprehensive error handling tests
 */
class ErrorHandlingTest {
    /**
     * Test network error scenarios
     */
    async testNetworkErrors() {
        // Connection timeouts
        // DNS resolution failures
        // Network interruptions
        // Retry mechanisms
    }

    /**
     * Test authentication errors
     */
    async testAuthErrors() {
        // Invalid credentials
        // Expired tokens
        // Scope violations
        // Refresh failures
    }

    /**
     * Test MCP protocol errors
     */
    async testProtocolErrors() {
        // Malformed JSON-RPC
        // Unknown methods
        // Invalid parameters
        // Server errors
    }
}
```

## 実装ファイル

### 新規作成
- `plugins/nodebb-plugin-mcp-server/tests/oauth-flow.js` - E2Eテストスイート
- `plugins/nodebb-plugin-mcp-server/tests/claude-desktop-config.js` - 設定生成ツール
- `plugins/nodebb-plugin-mcp-server/tests/compatibility.js` - 互換性テスト

### 設定ファイル
- `plugins/nodebb-plugin-mcp-server/examples/claude_desktop_config.json` - サンプル設定
- `plugins/nodebb-plugin-mcp-server/docs/claude-desktop-setup.md` - セットアップガイド

## テスト観点

### 正常系
1. **OAuth2フロー完走**: Device Authorization Grantの全ステップが正常完了
2. **MCP通信確立**: 認証後のtools/list、search等の正常動作
3. **SSE接続維持**: 長時間接続での安定性確認
4. **トークン更新**: リフレッシュトークンによる自動更新

### 異常系
1. **認証失敗**: 無効な認証情報での適切なエラーハンドリング
2. **ネットワーク障害**: 接続断・タイムアウト時の回復動作
3. **プロトコルエラー**: 不正なJSON-RPCメッセージの処理
4. **リソース制限**: 接続数上限・レート制限時の動作

### Claude Desktop固有
1. **mcp-remote互換性**: `@anthropic/mcp-server-remote`経由での正常動作
2. **設定ファイル**: `claude_desktop_config.json`の正確性
3. **UI統合**: Claude Desktop内でのMCPサーバー表示・操作
4. **エラー表示**: Claude Desktop側でのエラーメッセージ表示

### パフォーマンス
1. **初回接続時間**: OAuth2フロー完了までの時間
2. **レスポンス速度**: tools/list、search等のレスポンス時間
3. **メモリ使用量**: 長時間接続時のメモリリーク確認
4. **並行接続**: 複数Claude Desktopクライアントからの同時接続