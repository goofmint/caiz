const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');

class DiscordOAuth {
    constructor() {
        this.clientId = null;
        this.clientSecret = null;
        this.redirectUri = null;
        this.scopes = ['identify', 'guilds', 'webhook.incoming'];
    }
    
    async initialize() {
        try {
            this.clientId = await meta.settings.getOne('caiz', 'oauth:discord:clientId');
            this.clientSecret = await meta.settings.getOne('caiz', 'oauth:discord:clientSecret');
            
            // リダイレクトURIを構築
            const nconf = require.main.require('nconf');
            const url = nconf.get('url');
            this.redirectUri = `${url}/api/v3/plugins/caiz/oauth/discord/callback`;
            
            winston.info(`[plugin/caiz] Discord OAuth initialized with redirect URI: ${this.redirectUri}`);
        } catch (err) {
            winston.error(`[plugin/caiz] Error initializing Discord OAuth: ${err.message}`);
            throw err;
        }
    }
    
    generateAuthUrl(cid, state) {
        if (!this.clientId) {
            throw new Error('Discord OAuth not configured');
        }
        
        const params = querystring.stringify({
            client_id: this.clientId,
            scope: this.scopes.join(' '),
            redirect_uri: this.redirectUri,
            state: state,
            response_type: 'code'
        });
        
        return `https://discord.com/oauth2/authorize?${params}`;
    }
    
    generateState(cid, uid) {
        // セキュリティのためのstateパラメータを生成
        const timestamp = Date.now();
        const data = `${cid}:${uid}:${timestamp}`;
        const hash = crypto.createHmac('sha256', this.clientSecret || 'fallback-secret')
            .update(data)
            .digest('hex');
        
        return Buffer.from(`${data}:${hash}`).toString('base64');
    }
    
    verifyState(state) {
        try {
            const decoded = Buffer.from(state, 'base64').toString('utf8');
            const parts = decoded.split(':');
            
            if (parts.length !== 4) {
                return null;
            }
            
            const [cid, uid, timestamp, hash] = parts;
            const data = `${cid}:${uid}:${timestamp}`;
            const expectedHash = crypto.createHmac('sha256', this.clientSecret || 'fallback-secret')
                .update(data)
                .digest('hex');
            
            if (hash !== expectedHash) {
                return null;
            }
            
            // 1時間以内の認証要求のみ有効
            const now = Date.now();
            const authTime = parseInt(timestamp);
            if (now - authTime > 3600000) {
                return null;
            }
            
            return {
                cid: parseInt(cid),
                uid: parseInt(uid),
                timestamp: authTime
            };
        } catch (err) {
            winston.error(`[plugin/caiz] Error verifying state: ${err.message}`);
            return null;
        }
    }
    
    async handleCallback(code, state) {
        try {
            const stateData = this.verifyState(state);
            if (!stateData) {
                throw new Error('Invalid or expired state parameter');
            }
            
            const { cid, uid } = stateData;
            
            // アクセストークンを取得
            const tokenData = await this.exchangeCodeForToken(code);
            
            // ユーザー情報とサーバー情報を取得
            const [userInfo, guilds] = await Promise.all([
                this.getUserInfo(tokenData.access_token),
                this.getUserGuilds(tokenData.access_token)
            ]);
            
            // Webhook情報の処理
            let webhookInfo = null;
            if (tokenData.webhook) {
                webhookInfo = {
                    id: tokenData.webhook.id,
                    token: tokenData.webhook.token,
                    url: tokenData.webhook.url,
                    guildId: tokenData.webhook.guild_id,
                    channelId: tokenData.webhook.channel_id
                };
            }
            
            // 管理権限を持つ最初のサーバーを選択
            const managedGuild = guilds.find(g => (g.permissions & 0x20) === 0x20) || guilds[0];
            
            // コミュニティ設定を保存
            const communityDiscordSettings = require('./community-discord-settings');
            await communityDiscordSettings.saveSettings(cid, {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                guildId: managedGuild?.id,
                guildName: managedGuild?.name,
                userId: userInfo.id,
                username: userInfo.username,
                connectedAt: new Date().toISOString(),
                webhook: webhookInfo,
                notifications: {
                    newTopic: true,
                    newPost: true,
                    memberJoin: true,
                    memberLeave: true
                }
            });
            
            winston.info(`[plugin/caiz] Discord connected for community ${cid} to guild ${managedGuild?.name}`);
            
            return {
                success: true,
                cid,
                uid,
                guildName: managedGuild?.name
            };
        } catch (err) {
            winston.error(`[plugin/caiz] Error handling Discord callback: ${err.message}`);
            throw err;
        }
    }
    
    async exchangeCodeForToken(code) {
        const data = querystring.stringify({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: this.redirectUri
        });
        
        const options = {
            hostname: 'discord.com',
            port: 443,
            path: '/api/oauth2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (response.error) {
                            reject(new Error(`Discord API error: ${response.error_description || response.error}`));
                        } else {
                            resolve(response);
                        }
                    } catch (e) {
                        reject(new Error('Invalid response from Discord API'));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(data);
            req.end();
            
            // 10秒でタイムアウト
            setTimeout(() => {
                req.destroy();
                reject(new Error('Request timeout'));
            }, 10000);
        });
    }
    
    async getUserInfo(accessToken) {
        const options = {
            hostname: 'discord.com',
            port: 443,
            path: '/api/users/@me',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (response.message) {
                            reject(new Error(`Discord API error: ${response.message}`));
                        } else {
                            resolve(response);
                        }
                    } catch (e) {
                        reject(new Error('Invalid response from Discord API'));
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
            
            // 10秒でタイムアウト
            setTimeout(() => {
                req.destroy();
                reject(new Error('Request timeout'));
            }, 10000);
        });
    }
    
    async getUserGuilds(accessToken) {
        const options = {
            hostname: 'discord.com',
            port: 443,
            path: '/api/users/@me/guilds',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (response.message) {
                            reject(new Error(`Discord API error: ${response.message}`));
                        } else {
                            resolve(response);
                        }
                    } catch (e) {
                        reject(new Error('Invalid response from Discord API'));
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
            
            // 10秒でタイムアウト
            setTimeout(() => {
                req.destroy();
                reject(new Error('Request timeout'));
            }, 10000);
        });
    }
    
    async disconnect(cid) {
        try {
            const communityDiscordSettings = require('./community-discord-settings');
            await communityDiscordSettings.deleteSettings(cid);
            winston.info(`[plugin/caiz] Discord disconnected for community ${cid}`);
            return { success: true };
        } catch (err) {
            winston.error(`[plugin/caiz] Error disconnecting Discord for community ${cid}: ${err.message}`);
            throw err;
        }
    }
}

module.exports = new DiscordOAuth();