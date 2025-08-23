'use strict';

const winston = require.main.require('winston');

/**
 * OAuth 2.0 Resource Server Metadata provider
 * Implements RFC 8414 specification for MCP server
 */
class ResourceServerMetadata {
    /**
     * Get resource server metadata according to RFC 8414
     * @returns {Object} Resource server metadata object
     */
    static getMetadata() {
        winston.verbose('[mcp-server] Generating resource server metadata');
        
        // RFC 8414準拠のリソースサーバーメタデータを返す
        // 実装は次のフェーズで追加予定
        // 基本構造：resource, authorization_servers, jwks_uri, scopes_supported など
        
        throw new Error('Implementation pending - interface only');
    }
    
    /**
     * Validate metadata configuration
     * @returns {boolean} Validation result
     */
    static validateConfiguration() {
        winston.verbose('[mcp-server] Validating metadata configuration');
        
        // 現在の設定の妥当性を検証
        // 必須フィールドの存在確認
        // URL形式の検証
        // スコープ定義の確認
        
        throw new Error('Implementation pending - interface only');
    }
    
    /**
     * Get supported OAuth 2.0 scopes for MCP operations
     * @returns {Array<string>} Supported scopes
     */
    static getSupportedScopes() {
        winston.verbose('[mcp-server] Getting supported OAuth scopes');
        
        // MCPサーバー用のスコープ定義を返す
        // mcp:read, mcp:write, mcp:admin などの基本スコープ
        
        throw new Error('Implementation pending - interface only');
    }
    
    /**
     * Get authorization server endpoints
     * @returns {Array<string>} Authorization server URLs
     */
    static getAuthorizationServers() {
        winston.verbose('[mcp-server] Getting authorization server endpoints');
        
        // 認証サーバーのエンドポイント一覧を返す
        // 環境設定から動的に取得
        
        throw new Error('Implementation pending - interface only');
    }
}

module.exports = ResourceServerMetadata;