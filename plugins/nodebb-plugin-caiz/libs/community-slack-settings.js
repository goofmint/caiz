const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');

class CommunitySlackSettings {
    constructor() {
        this.settingsPrefix = 'community:slack:';
    }
    
    async getSettings(cid) {
        try {
            const settings = {};
            const keys = [
                'accessToken',
                'teamId', 
                'teamName',
                'channelId',
                'channelName',
                'webhookUrl',
                'userId',
                'connectedAt'
            ];
            
            for (const key of keys) {
                const value = await meta.settings.getOne('caiz', `${this.settingsPrefix}${cid}:${key}`);
                if (value) {
                    settings[key] = value;
                }
            }
            
            return Object.keys(settings).length > 0 ? settings : null;
        } catch (err) {
            winston.error(`[plugin/caiz] Error getting Slack settings for community ${cid}: ${err.message}`);
            throw err;
        }
    }
    
    async saveSettings(cid, settings) {
        try {
            const updates = {};
            
            const allowedKeys = [
                'accessToken',
                'teamId',
                'teamName', 
                'channelId',
                'channelName',
                'webhookUrl',
                'userId',
                'connectedAt'
            ];
            
            for (const key of allowedKeys) {
                if (settings[key] !== undefined) {
                    updates[`${this.settingsPrefix}${cid}:${key}`] = settings[key];
                }
            }
            
            if (Object.keys(updates).length > 0) {
                await meta.settings.set('caiz', updates);
                winston.info(`[plugin/caiz] Slack settings saved for community ${cid}`);
            }
            
        } catch (err) {
            winston.error(`[plugin/caiz] Error saving Slack settings for community ${cid}: ${err.message}`);
            throw err;
        }
    }
    
    async deleteSettings(cid) {
        try {
            const keys = [
                'accessToken',
                'teamId',
                'teamName',
                'channelId', 
                'channelName',
                'webhookUrl',
                'userId',
                'connectedAt'
            ];
            
            const updates = {};
            for (const key of keys) {
                updates[`${this.settingsPrefix}${cid}:${key}`] = '';
            }
            
            await meta.settings.set('caiz', updates);
            winston.info(`[plugin/caiz] Slack settings deleted for community ${cid}`);
            
        } catch (err) {
            winston.error(`[plugin/caiz] Error deleting Slack settings for community ${cid}: ${err.message}`);
            throw err;
        }
    }
    
    async isConnected(cid) {
        try {
            const accessToken = await meta.settings.getOne('caiz', `${this.settingsPrefix}${cid}:accessToken`);
            const teamId = await meta.settings.getOne('caiz', `${this.settingsPrefix}${cid}:teamId`);
            
            return !!(accessToken && teamId);
        } catch (err) {
            winston.error(`[plugin/caiz] Error checking Slack connection for community ${cid}: ${err.message}`);
            return false;
        }
    }
    
    async getConnectionInfo(cid) {
        try {
            const isConnected = await this.isConnected(cid);
            
            if (!isConnected) {
                return {
                    connected: false
                };
            }
            
            const teamName = await meta.settings.getOne('caiz', `${this.settingsPrefix}${cid}:teamName`);
            const channelName = await meta.settings.getOne('caiz', `${this.settingsPrefix}${cid}:channelName`);
            const connectedAt = await meta.settings.getOne('caiz', `${this.settingsPrefix}${cid}:connectedAt`);
            
            return {
                connected: true,
                teamName: teamName || '',
                channelName: channelName || '',
                connectedAt: connectedAt || ''
            };
        } catch (err) {
            winston.error(`[plugin/caiz] Error getting Slack connection info for community ${cid}: ${err.message}`);
            return {
                connected: false
            };
        }
    }
    
    async setNotificationChannel(cid, channelId, channelName) {
        try {
            const updates = {
                [`${this.settingsPrefix}${cid}:channelId`]: channelId,
                [`${this.settingsPrefix}${cid}:channelName`]: channelName
            };
            
            await meta.settings.set('caiz', updates);
            winston.info(`[plugin/caiz] Slack notification channel set for community ${cid}: ${channelName}`);
            
        } catch (err) {
            winston.error(`[plugin/caiz] Error setting Slack notification channel for community ${cid}: ${err.message}`);
            throw err;
        }
    }
}

module.exports = new CommunitySlackSettings();