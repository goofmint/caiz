'use strict';

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

// OAuth2設定
const oauth2Config = {
    issuer: nconf.get('url'),
    clientId: 'caiz-mcp-server',
    deviceCodeExpiry: 600, // 10分
    accessTokenExpiry: 3600, // 1時間
    refreshTokenExpiry: 7776000, // 90日
    supportedScopes: ['openid', 'mcp:read', 'mcp:search', 'mcp:write']
};

/**
 * OAuth2認可サーバーメタデータを返却
 * RFC 8414準拠のメタデータレスポンス
 */
/**
 * Normalize base URL by constructing from request if needed and removing trailing slash
 */
function getBaseUrl(req) {
    let baseUrl = oauth2Config.issuer;
    
    // Fallback to constructing from request if issuer is missing
    if (!baseUrl) {
        baseUrl = req.protocol + '://' + req.get('host');
    }
    
    // Remove trailing slash to prevent double slashes in path concatenation
    return baseUrl.replace(/\/$/, '');
}

async function getAuthorizationServerMetadata(req, res) {
    try {
        winston.verbose('[mcp-server] OAuth2 authorization server metadata requested');
        
        const baseUrl = getBaseUrl(req);
        
        const metadata = {
            issuer: baseUrl,
            device_authorization_endpoint: `${baseUrl}/oauth/device_authorization`,
            token_endpoint: `${baseUrl}/oauth/token`,
            registration_endpoint: `${baseUrl}/oauth/register`,
            authorization_endpoint: `${baseUrl}/oauth/authorize`,
            grant_types_supported: [
                'authorization_code',
                'refresh_token'
            ],
            response_types_supported: ['code'],
            scopes_supported: oauth2Config.supportedScopes,
            token_endpoint_auth_methods_supported: ['none'],
            code_challenge_methods_supported: ['S256'],
            registration_endpoint_auth_methods_supported: ['none']
        };
        
        // RFC 8414準拠のセキュリティヘッダー設定
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
        });
        
        res.status(200).json(metadata);
        winston.verbose('[mcp-server] OAuth2 authorization server metadata sent');
        
    } catch (err) {
        winston.error('[mcp-server] Error serving OAuth2 metadata:', err);
        res.status(500).json({
            error: 'server_error',
            error_description: 'Failed to retrieve authorization server metadata'
        });
    }
}

/**
 * OpenID Connect Discovery（将来拡張用）
 */
async function getOpenidConfiguration(req, res) {
    try {
        winston.verbose('[mcp-server] OpenID Connect configuration requested');
        
        const baseUrl = getBaseUrl(req);
        
        const config = {
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/oauth/authorize`,
            token_endpoint: `${baseUrl}/oauth/token`,
            userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
            jwks_uri: `${baseUrl}/.well-known/jwks.json`,
            scopes_supported: oauth2Config.supportedScopes,
            response_types_supported: ['code', 'device_code'],
            grant_types_supported: [
                'authorization_code',
                'urn:ietf:params:oauth:grant-type:device_code',
                'refresh_token'
            ],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256'],
            token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
            code_challenge_methods_supported: ['S256']
        };
        
        // セキュリティヘッダー設定
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
        });
        
        res.status(200).json(config);
        winston.verbose('[mcp-server] OpenID Connect configuration sent');
        
    } catch (err) {
        winston.error('[mcp-server] Error serving OpenID Connect configuration:', err);
        res.status(500).json({
            error: 'server_error',
            error_description: 'Failed to retrieve OpenID Connect configuration'
        });
    }
}

module.exports = {
    getAuthorizationServerMetadata,
    getOpenidConfiguration,
    oauth2Config
};