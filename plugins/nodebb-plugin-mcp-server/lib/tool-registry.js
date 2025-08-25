'use strict';

const Ajv = require('ajv');
const winston = require.main.require('winston');

// JSON Schema validator instance with strict mode, defaults, and type coercion
const ajv = new Ajv({ 
    strict: true, 
    allErrors: true,
    useDefaults: true,
    coerceTypes: true
});

/**
 * Tool definition validation
 */
function validateToolDefinition(def) {
    if (!def || typeof def !== 'object') {
        throw new Error('Tool definition must be an object');
    }

    // name: 非空文字列、英数字・ハイフン・ピリオド・アンダースコアのみ
    if (!/^[a-z][a-z0-9._-]{2,63}$/.test(def.name)) {
        throw new Error('invalid name: must be 3-64 lowercase chars, start with letter, contain only alphanumeric characters, hyphen, period and underscore');
    }

    // description: 非空文字列
    if (!def.description || typeof def.description !== 'string' || !def.description.trim()) {
        throw new Error('empty description: must be non-empty string');
    }

    // inputSchema: 有効なJSON Schemaオブジェクト
    if (!def.inputSchema || typeof def.inputSchema !== 'object') {
        throw new Error('inputSchema must be an object');
    }

    if (def.inputSchema.type !== 'object') {
        throw new Error('inputSchema.type must be object');
    }

    // required配列の各要素がpropertiesに存在することを確認
    const required = def.inputSchema.required || [];
    const properties = def.inputSchema.properties || {};
    
    for (const k of required) {
        if (!properties[k]) {
            throw new Error(`missing required property schema: ${k}`);
        }
    }

    // compile once to ensure schema validity
    try {
        ajv.compile(def.inputSchema);
    } catch (err) {
        throw new Error(`invalid inputSchema: ${err.message}`);
    }
}

/**
 * Tool input validation using precompiled validators
 */
function validateToolInput(toolName, input, registry) {
    const tool = registry.getTool(toolName);
    if (!tool) {
        throw new Error(`Tool '${toolName}' not found`);
    }

    // Use precompiled validator for performance
    const valid = tool.validator(input);
    
    if (!valid) {
        throw new Error(ajv.errorsText(tool.validator.errors));
    }
    
    return valid;
}

/**
 * Tool Registry - manages tool definitions and provides tools/list functionality
 */
class ToolRegistry {
    constructor() {
        // ツールの内部登録ストレージ
        this.tools = new Map();
        winston.verbose('[mcp-server] ToolRegistry initialized');
    }

    /**
     * Register a tool definition
     * @param {Object} definition - Tool definition object
     */
    registerTool(definition) {
        // ツール定義をレジストリーに登録
        // 重複チェック、バリデーション実行
        try {
            validateToolDefinition(definition);
        } catch (err) {
            winston.error(`[mcp-server] Tool definition validation failed for '${definition?.name}':`, err.message);
            throw err;
        }

        // 重複チェック
        if (this.tools.has(definition.name)) {
            throw new Error(`Tool '${definition.name}' is already registered`);
        }

        // Precompile the input validator for performance
        let compiledValidator;
        try {
            compiledValidator = ajv.compile(definition.inputSchema);
        } catch (err) {
            throw new Error(`Failed to compile input schema validator: ${err.message}`);
        }

        // Enhanced tool definition with metadata and precompiled validator
        const enhancedTool = {
            id: definition.name,
            name: definition.name,
            description: definition.description,
            purpose: definition.description, // MCP spec uses 'purpose'
            inputSchema: definition.inputSchema,
            schema: definition.inputSchema, // Alias for MCP compatibility
            validator: compiledValidator, // Precompiled validator for input validation
            location: { type: 'local' },
            hidden: false,
            version: '1.0.0',
            registeredAt: Date.now()
        };

        this.tools.set(definition.name, enhancedTool);
        winston.info(`[mcp-server] Registered tool: ${definition.name}`);
    }

    /**
     * Get all registered tools
     * @param {Object} options - Filtering options
     * @param {boolean} options.include_remote - Include remote tools (default: false)
     * @param {boolean} options.include_hidden - Include hidden tools (default: false)
     * @returns {Array} Array of tool definitions
     */
    getToolsList(options = {}) {
        // 登録されたすべてのツール定義を返却
        // tools/listリクエスト用の形式で整形
        const { include_remote = false, include_hidden = false } = options;
        
        const tools = Array.from(this.tools.values()).filter(tool => {
            // Filter by remote/local
            if (!include_remote && tool.location?.type === 'remote') {
                return false;
            }
            
            // Filter by hidden status
            if (!include_hidden && tool.hidden) {
                return false;
            }
            
            return true;
        });

        winston.verbose(`[mcp-server] Retrieved ${tools.length} tools (include_remote=${include_remote}, include_hidden=${include_hidden})`);
        return tools;
    }

    /**
     * Get a specific tool by name
     * @param {string} name - Tool name
     * @returns {Object|null} Tool definition or null if not found
     */
    getTool(name) {
        // 指定された名前のツール定義を取得
        // tools/callリクエスト時の検証用
        const tool = this.tools.get(name);
        
        if (tool) {
            winston.verbose(`[mcp-server] Retrieved tool: ${name}`);
        } else {
            winston.verbose(`[mcp-server] Tool not found: ${name}`);
        }
        
        return tool || null;
    }

    /**
     * Get tool count
     * @returns {number} Number of registered tools
     */
    getToolCount() {
        return this.tools.size;
    }

    /**
     * Validate tool input for a specific tool
     * @param {string} toolName - Name of the tool
     * @param {any} input - Input data to validate
     * @returns {boolean} True if valid
     * @throws {Error} If validation fails
     */
    validateToolInput(toolName, input) {
        return validateToolInput(toolName, input, this);
    }
}

// Global registry instance
let globalRegistry = null;

/**
 * Get the global tool registry instance
 * @returns {ToolRegistry} Global registry instance
 */
function getToolRegistry() {
    if (!globalRegistry) {
        globalRegistry = new ToolRegistry();
    }
    return globalRegistry;
}

module.exports = {
    ToolRegistry,
    getToolRegistry,
    validateToolDefinition,
    validateToolInput
};