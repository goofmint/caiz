const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const privileges = require.main.require('./src/privileges');

class OAuthSettings {
    constructor() {
        this.settingsPrefix = 'caiz:oauth:';
    }
    
    /**
     * Get OAuth settings for a platform
     * @param {string} platform - 'slack' or 'discord'
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
                
                // In a real implementation, would make an API call to Slack
                // For now, just check if credentials exist
                return {
                    success: true,
                    message: 'Slack credentials are configured'
                };
                
            } else if (platform === 'discord') {
                const clientId = await meta.settings.getOne('caiz', `oauth:discord:clientId`);
                const botToken = await meta.settings.getOne('caiz', `oauth:discord:botToken`);
                
                if (!clientId || !botToken) {
                    return {
                        success: false,
                        message: 'Discord OAuth credentials not configured'
                    };
                }
                
                // In a real implementation, would make an API call to Discord
                // For now, just check if credentials exist
                return {
                    success: true,
                    message: 'Discord credentials are configured'
                };
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
        
        return {
            slack,
            discord
        };
    }
}

module.exports = new OAuthSettings();