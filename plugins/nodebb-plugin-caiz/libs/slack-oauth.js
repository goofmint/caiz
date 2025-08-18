const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');

class SlackOAuth {
    constructor() {
        this.clientId = null;
        this.clientSecret = null;
        this.redirectUri = null;
        this.scopes = ['channels:read', 'chat:write', 'incoming-webhook', 'team:read'];
    }
    
    async initialize() {
        try {
            this.clientId = await meta.settings.getOne('caiz', 'oauth:slack:clientId');
            this.clientSecret = await meta.settings.getOne('caiz', 'oauth:slack:clientSecret');
            
            // リダイレクトURIを構築
            const nconf = require.main.require('nconf');
            const url = nconf.get('url');
            this.redirectUri = `${url}/api/v3/plugins/caiz/oauth/slack/callback`;
            
            winston.info(`[plugin/caiz] Slack OAuth initialized with redirect URI: ${this.redirectUri}`);
        } catch (err) {
            winston.error(`[plugin/caiz] Error initializing Slack OAuth: ${err.message}`);
            throw err;
        }
    }
    
    generateAuthUrl(cid, state) {
        if (!this.clientId) {
            throw new Error('Slack OAuth not configured');
        }
        
        const params = querystring.stringify({
            client_id: this.clientId,
            scope: this.scopes.join(','),
            redirect_uri: this.redirectUri,
            state: state,
            response_type: 'code'
        });
        
        return `https://slack.com/oauth/v2/authorize?${params}`;
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
            
            // ワークスペース情報を取得
            const teamInfo = await this.getTeamInfo(tokenData.access_token);
            
            // コミュニティ設定を保存
            const communitySlackSettings = require('./community-slack-settings');
            await communitySlackSettings.saveSettings(cid, {
                accessToken: tokenData.access_token,
                teamId: teamInfo.team.id,
                teamName: teamInfo.team.name,
                userId: uid,
                connectedAt: new Date().toISOString(),
                webhookUrl: tokenData.incoming_webhook?.url,
                channelName: tokenData.incoming_webhook?.channel,
                channelId: tokenData.incoming_webhook?.channel_id
            });
            
            winston.info(`[plugin/caiz] Slack connected for community ${cid} to team ${teamInfo.team.name}`);
            
            return {
                success: true,
                cid,
                uid,
                teamName: teamInfo.team.name,
                channelName: tokenData.incoming_webhook?.channel
            };
        } catch (err) {
            winston.error(`[plugin/caiz] Error handling Slack callback: ${err.message}`);
            throw err;
        }
    }
    
    async exchangeCodeForToken(code) {
        const data = querystring.stringify({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code: code,
            redirect_uri: this.redirectUri
        });
        
        const options = {
            hostname: 'slack.com',
            port: 443,
            path: '/api/oauth.v2.access',
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
                        if (response.ok) {
                            resolve(response);
                        } else {
                            reject(new Error(`Slack API error: ${response.error}`));
                        }
                    } catch (e) {
                        reject(new Error('Invalid response from Slack API'));
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
    
    async getTeamInfo(accessToken) {
        const options = {
            hostname: 'slack.com',
            port: 443,
            path: '/api/team.info',
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
                        if (response.ok) {
                            resolve(response);
                        } else {
                            reject(new Error(`Slack API error: ${response.error}`));
                        }
                    } catch (e) {
                        reject(new Error('Invalid response from Slack API'));
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
    
    async getChannels(cid) {
        try {
            const communitySlackSettings = require('./community-slack-settings');
            const settings = await communitySlackSettings.getSettings(cid);
            
            if (!settings || !settings.accessToken) {
                throw new Error('Slack not connected for this community');
            }
            
            const options = {
                hostname: 'slack.com',
                port: 443,
                path: '/api/conversations.list?types=public_channel,private_channel',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${settings.accessToken}`,
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
                            if (response.ok) {
                                const channels = response.channels.map(channel => ({
                                    id: channel.id,
                                    name: channel.name
                                }));
                                resolve(channels);
                            } else {
                                reject(new Error(`Slack API error: ${response.error}`));
                            }
                        } catch (e) {
                            reject(new Error('Invalid response from Slack API'));
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
        } catch (err) {
            winston.error(`[plugin/caiz] Error getting Slack channels for community ${cid}: ${err.message}`);
            throw err;
        }
    }
    
    async disconnect(cid) {
        try {
            const communitySlackSettings = require('./community-slack-settings');
            await communitySlackSettings.deleteSettings(cid);
            winston.info(`[plugin/caiz] Slack disconnected for community ${cid}`);
            return { success: true };
        } catch (err) {
            winston.error(`[plugin/caiz] Error disconnecting Slack for community ${cid}: ${err.message}`);
            throw err;
        }
    }
}

module.exports = new SlackOAuth();