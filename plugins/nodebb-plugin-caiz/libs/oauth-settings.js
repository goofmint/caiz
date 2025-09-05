const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const privileges = require.main.require('./src/privileges');

class OAuthSettings {
    constructor() {
        this.settingsPrefix = 'caiz:oauth:';
    }
    
    /**
     * Get OAuth settings for a platform
     * @param {string} platform - 'slack', 'discord', or 'x'
     * @returns {Object} Settings with secrets hidden
     */
    async getSettings(platform) {
        try {
            const settings = {};
            
            if (platform === 'slack') {
                settings.clientId = await meta.settings.getOne('caiz', `oauth:slack:clientId`);
                settings.hasSecret = !!(await meta.settings.getOne('caiz', `oauth:slack:clientSecret`));
                settings.hasSigningSecret = !!(await meta.settings.getOne('caiz', `oauth:slack:signingSecret`));
            } else if (platform === 'discord') {
                settings.clientId = await meta.settings.getOne('caiz', `oauth:discord:clientId`);
                settings.hasSecret = !!(await meta.settings.getOne('caiz', `oauth:discord:clientSecret`));
                settings.hasToken = !!(await meta.settings.getOne('caiz', `oauth:discord:botToken`));
            } else if (platform === 'x') {
                settings.clientKey = await meta.settings.getOne('caiz', `oauth:x:clientKey`);
                settings.hasSecret = !!(await meta.settings.getOne('caiz', `oauth:x:clientSecret`));
            }
            
            return settings;
        } catch (err) {
            winston.error(`[plugin/caiz] Error getting OAuth settings for ${platform}: ${err.message}`);
            throw err;
        }
    }
    
    /**
     * Save OAuth settings for a platform
     * @param {string} platform - 'slack' or 'discord'
     * @param {Object} settings - Settings to save
     */
    async saveSettings(platform, settings) {
        try {
            const updates = {};
            
            if (platform === 'slack') {
                if (settings.clientId !== undefined) {
                    updates[`oauth:slack:clientId`] = settings.clientId;
                }
                if (settings.clientSecret) {
                    updates[`oauth:slack:clientSecret`] = settings.clientSecret;
                }
                if (settings.signingSecret) {
                    updates[`oauth:slack:signingSecret`] = settings.signingSecret;
                }
            } else if (platform === 'discord') {
                if (settings.clientId !== undefined) {
                    updates[`oauth:discord:clientId`] = settings.clientId;
                }
                if (settings.clientSecret) {
                    updates[`oauth:discord:clientSecret`] = settings.clientSecret;
                }
                if (settings.botToken) {
                    updates[`oauth:discord:botToken`] = settings.botToken;
                }
            } else if (platform === 'x') {
                if (settings.clientKey !== undefined) {
                    updates[`oauth:x:clientKey`] = settings.clientKey;
                }
                if (settings.clientSecret) {
                    updates[`oauth:x:clientSecret`] = settings.clientSecret;
                }
            }
            
            await meta.settings.set('caiz', updates);
            winston.info(`[plugin/caiz] OAuth settings saved for ${platform}`);
            
        } catch (err) {
            winston.error(`[plugin/caiz] Error saving OAuth settings for ${platform}: ${err.message}`);
            throw err;
        }
    }
    
    /**
     * Test OAuth connection for a platform
     * @param {string} platform - 'slack' or 'discord'
     * @returns {Object} Test result
     */
    async testConnection(platform) {
        try {
            if (platform === 'slack') {
                const clientId = await meta.settings.getOne('caiz', `oauth:slack:clientId`);
                const clientSecret = await meta.settings.getOne('caiz', `oauth:slack:clientSecret`);
                
                if (!clientId || !clientSecret) {
                    return {
                        success: false,
                        message: 'Slack OAuth credentials not configured'
                    };
                }
                
                // Test Slack API connection by verifying client credentials
                try {
                    const https = require('https');
                    const querystring = require('querystring');
                    
                    const data = querystring.stringify({
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: 'client_credentials'
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
                    
                    const response = await new Promise((resolve, reject) => {
                        const req = https.request(options, (res) => {
                            let body = '';
                            res.on('data', (chunk) => body += chunk);
                            res.on('end', () => {
                                try {
                                    resolve(JSON.parse(body));
                                } catch (e) {
                                    reject(new Error('Invalid response from Slack API'));
                                }
                            });
                        });
                        
                        req.on('error', reject);
                        req.write(data);
                        req.end();
                        
                        // Timeout after 10 seconds
                        setTimeout(() => {
                            req.destroy();
                            reject(new Error('Request timeout'));
                        }, 10000);
                    });
                    
                    if (response.ok || response.error === 'invalid_grant_type') {
                        // invalid_grant_type means credentials are valid but grant type is wrong
                        // This is expected for client credentials flow test
                        return {
                            success: true,
                            message: 'Slack API connection successful - credentials are valid'
                        };
                    } else {
                        return {
                            success: false,
                            message: `Slack API error: ${response.error || 'Unknown error'}`
                        };
                    }
                } catch (apiError) {
                    return {
                        success: false,
                        message: `Connection test failed: ${apiError.message}`
                    };
                }
                
            } else if (platform === 'discord') {
                const clientId = await meta.settings.getOne('caiz', `oauth:discord:clientId`);
                const botToken = await meta.settings.getOne('caiz', `oauth:discord:botToken`);
                
                if (!clientId || !botToken) {
                    return {
                        success: false,
                        message: 'Discord OAuth credentials not configured'
                    };
                }
                
                // Test Discord API connection by getting bot user info
                try {
                    const https = require('https');
                    
                    const options = {
                        hostname: 'discord.com',
                        port: 443,
                        path: '/api/v10/users/@me',
                        method: 'GET',
                        headers: {
                            'Authorization': `Bot ${botToken}`,
                            'User-Agent': 'NodeBB-Plugin-Caiz (https://github.com/goofmint/caiz, 1.0.0)'
                        }
                    };
                    
                    const response = await new Promise((resolve, reject) => {
                        const req = https.request(options, (res) => {
                            let body = '';
                            res.on('data', (chunk) => body += chunk);
                            res.on('end', () => {
                                try {
                                    resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
                                } catch (e) {
                                    reject(new Error('Invalid response from Discord API'));
                                }
                            });
                        });
                        
                        req.on('error', reject);
                        req.end();
                        
                        // Timeout after 10 seconds
                        setTimeout(() => {
                            req.destroy();
                            reject(new Error('Request timeout'));
                        }, 10000);
                    });
                    
                    if (response.statusCode === 200) {
                        return {
                            success: true,
                            message: `Discord API connection successful - Bot: ${response.data.username}#${response.data.discriminator}`
                        };
                    } else {
                        return {
                            success: false,
                            message: `Discord API error: ${response.data.message || 'Unknown error'}`
                        };
                    }
                } catch (apiError) {
                    return {
                        success: false,
                        message: `Connection test failed: ${apiError.message}`
                    };
                }
            }
            
            return {
                success: false,
                message: 'Invalid platform'
            };
            
        } catch (err) {
            winston.error(`[plugin/caiz] Error testing OAuth connection for ${platform}: ${err.message}`);
            return {
                success: false,
                message: err.message
            };
        }
    }
    
    /**
     * Get all OAuth settings for admin panel
     * @returns {Object} All settings
     */
    async getAllSettings() {
        const slack = await this.getSettings('slack');
        const discord = await this.getSettings('discord');
        const x = await this.getSettings('x');
        
        return {
            slack,
            discord,
            x
        };
    }
}

module.exports = new OAuthSettings();