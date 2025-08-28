'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');
const user = require.main.require('./src/user');
const nconf = require.main.require('nconf');
const db = require.main.require('./src/database');
const JWKSManager = require('./jwks');
const TokenStorage = require('./token-storage');

// Token configuration
const tokenConfig = {
    accessTokenLifetime: 3600, // 1 hour in seconds
    refreshTokenLifetime: 7 * 24 * 3600, // 7 days in seconds
    tokenLength: 32, // bytes
    pollingInterval: 5, // 5 seconds for slow_down
    maxPollingViolations: 3 // max violations before backoff
};

/**
 * OAuth 2.0 Token Exchange Management
 */
class OAuthToken {
    constructor() {
        // Refresh tokens storage (production: Redis/DB)
        this.refreshTokens = new Map();
    }

    /**
     * Validate token request parameters
     * @param {Object} params - Request parameters
     * @throws {Error} If validation fails
     */
    validateTokenParams(params) {
        winston.verbose('[mcp-server] Validating token exchange parameters');

        const required = ['grant_type', 'code', 'redirect_uri', 'client_id', 'code_verifier', 'resource'];
        
        for (const param of required) {
            if (!params[param]) {
                throw new Error(`Missing required parameter: ${param}`);
            }
        }
        
        if (params.grant_type !== 'authorization_code') {
            throw new Error('Unsupported grant_type. Only "authorization_code" is supported');
        }

        // Validate code_verifier format (base64url)
        if (!/^[A-Za-z0-9_-]+$/.test(params.code_verifier)) {
            throw new Error('Invalid code_verifier format. Must be base64url encoded');
        }

        // Validate code_verifier length (43-128 characters per RFC 7636)
        if (params.code_verifier.length < 43 || params.code_verifier.length > 128) {
            throw new Error('Invalid code_verifier length. Must be 43-128 characters');
        }

        // Validate resource parameter
        const baseUrl = nconf.get('url');
        if (params.resource !== baseUrl) {
            throw new Error(`Invalid resource parameter. Expected: ${baseUrl}`);
        }
        
        winston.verbose('[mcp-server] Token parameters validation successful');
        return true;
    }

    /**
     * Validate authorization code and PKCE
     * @param {string} code - Authorization code
     * @param {string} codeVerifier - PKCE code verifier
     * @param {string} clientId - OAuth client ID
     * @param {string} redirectUri - Redirect URI
     * @param {string} resource - Resource parameter
     * @param {Object} oauthAuth - OAuthAuth instance for accessing auth codes
     * @returns {Object} Authorization code data
     * @throws {Error} If validation fails
     */
    validateAuthorizationCode(code, codeVerifier, clientId, redirectUri, resource, oauthAuth) {
        winston.verbose('[mcp-server] Validating authorization code and PKCE');

        const authCode = oauthAuth.getAuthCode(code);
        
        if (!authCode) {
            throw new Error('Invalid authorization code');
        }
        
        if (authCode.used) {
            throw new Error('Authorization code already used');
        }
        
        if (Date.now() > authCode.expiresAt) {
            oauthAuth.cleanupExpiredCodes();
            throw new Error('Authorization code expired');
        }
        
        if (authCode.clientId !== clientId) {
            throw new Error('Client ID mismatch');
        }
        
        if (authCode.redirectUri !== redirectUri) {
            throw new Error('Redirect URI mismatch');
        }
        
        if (authCode.resource !== resource) {
            throw new Error('Resource parameter mismatch');
        }
        
        // PKCE verification: S256(code_verifier) must equal code_challenge
        const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
        if (hash !== authCode.codeChallenge) {
            throw new Error('PKCE verification failed');
        }
        
        winston.verbose('[mcp-server] Authorization code and PKCE validation successful');
        return authCode;
    }

    /**
     * Generate access token (JWT)
     * @param {Object} authCode - Authorization code data
     * @param {Object} userData - User data from NodeBB
     * @returns {Object} Access token response
     */
    generateAccessToken(authCode, userData) {
        winston.verbose('[mcp-server] Generating access token for user:', authCode.userId);

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = 3600; // 1 hour
        const baseUrl = nconf.get('url');
        
        const payload = {
            iss: baseUrl,
            aud: baseUrl,
            sub: String(authCode.userId),
            iat: now,
            exp: now + expiresIn,
            scope: authCode.scopes.join(' '),
            preferred_username: userData.username,
            name: userData.displayname || userData.username,
            email: userData.email
        };
        
        const accessToken = JWKSManager.signJWT(payload);
        
        winston.verbose('[mcp-server] Access token generated successfully');
        
        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: expiresIn,
            scope: authCode.scopes.join(' ')
        };
    }

    /**
     * Generate refresh token (optional)
     * @param {Object} authCode - Authorization code data
     * @returns {Object} Refresh token response
     */
    generateRefreshToken(authCode) {
        winston.verbose('[mcp-server] Generating refresh token for user:', authCode.userId);

        const refreshToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        this.refreshTokens.set(refreshToken, {
            userId: authCode.userId,
            clientId: authCode.clientId,
            scopes: authCode.scopes,
            expiresAt
        });
        
        winston.verbose('[mcp-server] Refresh token generated successfully');
        
        return {
            refresh_token: refreshToken,
            refresh_token_expires_in: 86400 // 24 hours
        };
    }

    /**
     * Process token exchange
     * @param {Object} params - Token request parameters
     * @param {Object} oauthAuth - OAuthAuth instance for accessing auth codes
     * @returns {Object} Token response
     * @throws {Error} If exchange fails
     */
    async exchangeCodeForToken(params, oauthAuth) {
        winston.verbose('[mcp-server] Starting token exchange process');

        // 1. Validate parameters
        this.validateTokenParams(params);
        
        // 2. Validate authorization code and PKCE
        const authCode = this.validateAuthorizationCode(
            params.code,
            params.code_verifier,
            params.client_id,
            params.redirect_uri,
            params.resource,
            oauthAuth
        );
        
        // 3. Get user data from NodeBB
        const userData = await user.getUserData(authCode.userId);
        if (!userData) {
            throw new Error('Failed to retrieve user information');
        }
        
        // 4. Mark code as used (one-time use)
        oauthAuth.markAuthCodeAsUsed(params.code);
        
        // 5. Generate tokens
        const accessTokenResponse = this.generateAccessToken(authCode, userData);
        const refreshTokenResponse = this.generateRefreshToken(authCode);
        
        // 6. Clean up expired codes
        oauthAuth.cleanupExpiredCodes();
        
        winston.verbose('[mcp-server] Token exchange completed successfully');
        
        return {
            ...accessTokenResponse,
            ...refreshTokenResponse
        };
    }

    /**
     * Cleanup expired tokens (Token Storage経由)
     */
    async cleanupExpiredTokens() {
        try {
            const cleanedCount = await TokenStorage.cleanupExpiredTokens();
            if (cleanedCount > 0) {
                winston.verbose(`[mcp-server] Cleaned up ${cleanedCount} expired tokens via TokenStorage`);
            }
            return cleanedCount;
        } catch (err) {
            winston.error('[mcp-server] Token cleanup failed:', err);
            return 0;
        }
    }

    /**
     * Get refresh token data (Token Storage経由)
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<Object|null>} Refresh token data
     */
    async getRefreshToken(refreshToken) {
        if (!refreshToken) {
            return null;
        }
        
        const refreshTokenHash = this._hashToken(refreshToken);
        return await TokenStorage.getToken(refreshTokenHash, 'refresh');
    }

    /**
     * Revoke refresh token (Token Storage経由)
     * @param {string} refreshToken - Refresh token to revoke
     * @returns {Promise<boolean>} True if token was found and revoked
     */
    async revokeRefreshToken(refreshToken) {
        if (!refreshToken) {
            return false;
        }
        
        try {
            const refreshTokenHash = this._hashToken(refreshToken);
            const tokenData = await TokenStorage.getToken(refreshTokenHash, 'refresh');
            
            if (!tokenData) {
                return false;
            }
            
            // Token Family全体を無効化
            if (tokenData.rotation_family_id) {
                await TokenStorage.revokeTokenFamily(tokenData.rotation_family_id);
                winston.info('[mcp-server] Refresh token family revoked', { 
                    family_id: tokenData.rotation_family_id,
                    user_id: tokenData.user_id,
                    client_id: tokenData.client_id
                });
            }
            
            return true;
            
        } catch (err) {
            winston.error('[mcp-server] Failed to revoke refresh token:', err);
            return false;
        }
    }

    /**
     * Device codeをアクセストークンに交換 (RFC 8628)
     * @param {Object} params - トークンリクエストパラメータ
     * @param {string} params.grant_type - グラントタイプ
     * @param {string} params.device_code - デバイスコード
     * @param {string} params.client_id - クライアントID
     * @param {Object} ctx - リクエストコンテキスト情報
     * @param {string} ctx.ip - クライアントIPアドレス
     * @param {string} ctx.userAgent - クライアントのユーザーエージェント
     * @param {number} [ctx.now=Date.now()] - リクエスト受信時刻タイムスタンプ
     * @returns {Promise<Object>} Token response
     * @throws {Error} RFC 8628準拠のエラー
     */
    async exchangeDeviceCodeForToken(params, ctx = {}) {
        const { grant_type, device_code, client_id } = params;
        const { ip, userAgent, now = Date.now() } = ctx;

        winston.verbose('[mcp-server] Device token exchange request', { client_id, ip, userAgent });

        // 1. パラメータ検証
        if (!grant_type || grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
            const error = new Error('Invalid or unsupported grant_type');
            error.code = 'unsupported_grant_type';
            throw error;
        }

        if (!device_code) {
            const error = new Error('Missing required parameter: device_code');
            error.code = 'invalid_request';
            throw error;
        }

        if (!client_id) {
            const error = new Error('Missing required parameter: client_id');
            error.code = 'invalid_request';
            throw error;
        }

        // 2. device_code取得と検証
        const deviceKey = `oauth:device:${device_code}`;
        const deviceDataJson = await db.get(deviceKey);
        
        if (!deviceDataJson) {
            winston.warn('[mcp-server] Device code not found', { device_code: device_code.substring(0, 8) + '...' });
            const error = new Error('Invalid device_code');
            error.code = 'invalid_grant';
            throw error;
        }

        let deviceData;
        try {
            deviceData = JSON.parse(deviceDataJson);
        } catch (err) {
            winston.error('[mcp-server] Failed to parse device data', err);
            const error = new Error('Invalid device_code');
            error.code = 'invalid_grant';
            throw error;
        }

        // 3. client_id一致検証
        if (deviceData.client_id !== client_id) {
            winston.warn('[mcp-server] Client ID mismatch', { 
                expected: deviceData.client_id, 
                provided: client_id 
            });
            const error = new Error('Client ID mismatch');
            error.code = 'invalid_client';
            throw error;
        }

        // 4. 有効期限チェック
        if (now > deviceData.expires_at) {
            winston.warn('[mcp-server] Device code expired', { device_code: device_code.substring(0, 8) + '...' });
            const error = new Error('Device code has expired');
            error.code = 'expired_token';
            throw error;
        }

        // 5. ポーリング間隔チェック
        const lastPollAt = deviceData.last_poll_at || 0;
        const timeSinceLastPoll = now - lastPollAt;
        const requiredInterval = deviceData.polling_interval || tokenConfig.pollingInterval;

        if (timeSinceLastPoll < requiredInterval * 1000) {
            // ポーリング違反を記録
            const violationCount = (deviceData.polling_violations || 0) + 1;
            const newInterval = Math.max(requiredInterval + 5, requiredInterval * Math.pow(2, violationCount - 1));
            
            await db.set(deviceKey, JSON.stringify({
                ...deviceData,
                last_poll_at: now,
                polling_violations: violationCount,
                polling_interval: newInterval
            }));
            await db.expire(deviceKey, Math.ceil((deviceData.expires_at - now) / 1000));

            winston.warn('[mcp-server] Polling too frequent', { 
                client_id, 
                violation_count: violationCount,
                new_interval: newInterval
            });

            const error = new Error('Polling too frequent');
            error.code = 'slow_down';
            error.retryAfter = newInterval;
            throw error;
        }

        // 6. 状態確認と処理
        if (deviceData.status === 'pending') {
            // ポーリング記録を更新
            await db.set(deviceKey, JSON.stringify({
                ...deviceData,
                last_poll_at: now
            }));
            await db.expire(deviceKey, Math.ceil((deviceData.expires_at - now) / 1000));

            const error = new Error('User has not yet completed authorization');
            error.code = 'authorization_pending';
            throw error;
        }

        if (deviceData.status === 'denied') {
            winston.info('[mcp-server] Device authorization was denied', { client_id });
            const error = new Error('User denied the authorization request');
            error.code = 'access_denied';
            throw error;
        }

        if (deviceData.status === 'token_issued') {
            winston.warn('[mcp-server] Device code already used', { device_code: device_code.substring(0, 8) + '...' });
            const error = new Error('Device code has already been used');
            error.code = 'invalid_grant';
            throw error;
        }

        if (deviceData.status !== 'approved') {
            winston.warn('[mcp-server] Invalid device code status', { status: deviceData.status });
            const error = new Error('Invalid device code status');
            error.code = 'invalid_grant';
            throw error;
        }

        // 7. トークン生成と発行
        try {
            const tokenResponse = await this.generateDeviceTokens(
                deviceData.user_id,
                client_id,
                deviceData.scope ? deviceData.scope.split(/[\s+]+/) : ['mcp:read']
            );

            // 8. device_code状態更新（approved -> token_issued）
            const tokenHash = this._hashToken(tokenResponse.access_token);
            await db.set(deviceKey, JSON.stringify({
                ...deviceData,
                status: 'token_issued',
                access_token_hash: tokenHash,
                token_issued_at: now
            }));
            await db.expire(deviceKey, 3600); // 1時間後に削除

            winston.info('[mcp-server] Device token issued successfully', { 
                client_id, 
                user_id: deviceData.user_id,
                scopes: tokenResponse.scope
            });

            return tokenResponse;

        } catch (err) {
            winston.error('[mcp-server] Device token generation failed', err);
            const error = new Error('Failed to generate tokens');
            error.code = 'server_error';
            throw error;
        }
    }

    /**
     * Device Grant用アクセストークン生成
     * @param {number} userId - NodeBBユーザーID
     * @param {string} clientId - クライアントID
     * @param {Array<string>} scopes - 承認されたスコープ
     * @returns {Promise<Object>} Token pair
     */
    async generateDeviceTokens(userId, clientId, scopes) {
        if (!userId || !clientId || !Array.isArray(scopes)) {
            throw new Error('Invalid parameters for token generation');
        }

        const now = Date.now();

        // トークン生成
        const accessToken = this._generateSecureToken();
        const refreshToken = this._generateSecureToken();
        // Generate UUID v4 without external dependency
        const rotationFamilyId = crypto.randomBytes(16).toString('hex').replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
            '$1-$2-$3-$4-$5'
        );

        // ハッシュ計算
        const accessTokenHash = this._hashToken(accessToken);
        const refreshTokenHash = this._hashToken(refreshToken);

        // アクセストークンデータ
        const accessTokenData = {
            access_token_hash: accessTokenHash,
            user_id: userId,
            client_id: clientId,
            scopes: scopes,
            expires_at: now + (tokenConfig.accessTokenLifetime * 1000),
            created_at: now
        };

        // リフレッシュトークンデータ
        const refreshTokenData = {
            refresh_token_hash: refreshTokenHash,
            access_token_hash: accessTokenHash,
            user_id: userId,
            client_id: clientId,
            rotation_family_id: rotationFamilyId,
            expires_at: now + (tokenConfig.refreshTokenLifetime * 1000),
            created_at: now
        };

        // データベース保存 (Token Storage経由)
        await Promise.all([
            // アクセストークン保存
            TokenStorage.storeAccessToken(accessTokenHash, accessTokenData, tokenConfig.accessTokenLifetime),
            
            // リフレッシュトークン保存
            TokenStorage.storeRefreshToken(refreshTokenHash, refreshTokenData, rotationFamilyId, tokenConfig.refreshTokenLifetime)
        ]);

        winston.verbose('[mcp-server] Device tokens generated and stored', { 
            user_id: userId, 
            client_id: clientId, 
            scopes: scopes.join(' ')
        });

        // レスポンス
        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: tokenConfig.accessTokenLifetime,
            refresh_token: refreshToken,
            scope: scopes.join(' ')
        };
    }

    /**
     * リフレッシュトークンでアクセストークン更新
     * @param {string} refreshToken - リフレッシュトークン
     * @returns {Promise<Object>} 新しいToken pair
     */
    async refreshDeviceAccessToken(refreshToken) {
        if (!refreshToken) {
            throw new Error('Missing refresh token');
        }

        const refreshTokenHash = this._hashToken(refreshToken);
        
        // Token Storage経由でリフレッシュトークン取得
        const tokenData = await TokenStorage.getToken(refreshTokenHash, 'refresh');
        if (!tokenData) {
            winston.warn('[mcp-server] Invalid or expired refresh token attempt');
            const error = new Error('Invalid refresh token');
            error.code = 'invalid_grant';
            throw error;
        }

        // トークンが既に使用済み（revoked）かチェック
        if (await TokenStorage.isTokenRevoked(refreshTokenHash)) {
            // セキュリティ違反: 無効化されたトークンの使用検知
            winston.warn('[mcp-server] Revoked refresh token reuse detected - revoking token family', {
                user_id: tokenData.user_id,
                client_id: tokenData.client_id,
                family_id: tokenData.rotation_family_id
            });
            
            // Token Family全体を無効化 (Security Breach Detection)
            if (tokenData.rotation_family_id) {
                await TokenStorage.revokeTokenFamily(tokenData.rotation_family_id);
            }
            
            const error = new Error('Refresh token has been revoked due to security violation');
            error.code = 'invalid_grant';
            throw error;
        }

        try {
            // 新しいトークンペア生成
            const newAccessToken = this._generateSecureToken();
            const newRefreshToken = this._generateSecureToken();
            const now = Date.now();

            // 新しいアクセストークンデータ
            const newAccessTokenData = {
                access_token_hash: this._hashToken(newAccessToken),
                user_id: tokenData.user_id,
                client_id: tokenData.client_id,
                scopes: tokenData.scopes || ['mcp:read'],
                expires_at: now + (tokenConfig.accessTokenLifetime * 1000),
                created_at: now
            };

            // 新しいリフレッシュトークンデータ
            const newRefreshTokenData = {
                refresh_token_hash: this._hashToken(newRefreshToken),
                access_token_hash: newAccessTokenData.access_token_hash,
                user_id: tokenData.user_id,
                client_id: tokenData.client_id,
                expires_at: now + (tokenConfig.refreshTokenLifetime * 1000),
                created_at: now,
                parent_token_hash: refreshTokenHash
            };

            // Token Storage経由でトークン回転実行
            await TokenStorage.rotateRefreshToken(
                refreshTokenHash,
                this._hashToken(newRefreshToken),
                newRefreshTokenData
            );

            // 新しいアクセストークンを保存
            await TokenStorage.storeAccessToken(
                newAccessTokenData.access_token_hash,
                newAccessTokenData,
                tokenConfig.accessTokenLifetime
            );

            winston.info('[mcp-server] Refresh token rotated successfully', { 
                user_id: tokenData.user_id, 
                client_id: tokenData.client_id,
                family_id: tokenData.rotation_family_id,
                old_generation: tokenData.generation,
                new_generation: (tokenData.generation || 1) + 1
            });

            // レスポンス
            return {
                access_token: newAccessToken,
                token_type: 'Bearer',
                expires_in: tokenConfig.accessTokenLifetime,
                refresh_token: newRefreshToken,
                scope: Array.isArray(newAccessTokenData.scopes) ? newAccessTokenData.scopes.join(' ') : (newAccessTokenData.scopes || '')
            };

        } catch (err) {
            winston.error('[mcp-server] Refresh token rotation failed:', err);
            const error = new Error('Failed to refresh token');
            error.code = 'server_error';
            throw error;
        }
    }

    /**
     * Device Grant用トークン検証
     * @param {string} accessToken - アクセストークン
     * @returns {Promise<Object>} トークン情報 (userId, scopes, etc.)
     */
    async validateDeviceAccessToken(accessToken) {
        if (!accessToken) {
            throw new Error('Missing access token');
        }

        const tokenHash = this._hashToken(accessToken);
        
        // Token Storage経由でアクセストークン取得
        const tokenData = await TokenStorage.getToken(tokenHash, 'access');
        if (!tokenData) {
            throw new Error('Invalid or expired access token');
        }

        return {
            userId: tokenData.user_id,
            clientId: tokenData.client_id,
            scopes: tokenData.scopes || [],
            expiresAt: tokenData.expires_at,
            createdAt: tokenData.created_at
        };
    }

    /**
     * Device Grant用トークン検証 (Token Storage経由)
     * @param {string} accessToken - アクセストークン
     * @returns {Promise<Object>} トークン情報 (userId, scopes, etc.)
     */
    async validateDeviceAccessToken(accessToken) {
        if (!accessToken) {
            throw new Error('Missing access token');
        }

        const tokenHash = this._hashToken(accessToken);
        
        // Token Storage経由でアクセストークン取得
        const tokenData = await TokenStorage.getToken(tokenHash, 'access');
        if (!tokenData) {
            throw new Error('Invalid or expired access token');
        }

        return {
            userId: tokenData.user_id,
            clientId: tokenData.client_id,
            scopes: tokenData.scopes || [],
            expiresAt: tokenData.expires_at,
            createdAt: tokenData.created_at
        };
    }

    /**
     * 暗号学的に安全なトークン生成
     * @returns {string} Base64URL encoded token
     * @private
     */
    _generateSecureToken() {
        const bytes = crypto.randomBytes(tokenConfig.tokenLength);
        return bytes
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * トークンのSHA-256ハッシュ計算
     * @param {string} token - Base64URL encoded token
     * @returns {string} Hex encoded hash
     * @private
     */
    _hashToken(token) {
        return crypto
            .createHash('sha256')
            .update(Buffer.from(token, 'base64url'))
            .digest('hex');
    }
}

// Singleton instance
const oauthToken = new OAuthToken();

module.exports = oauthToken;