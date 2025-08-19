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

    async getNotificationSettings(cid) {
        try {
            const db = require.main.require('./src/database');
            const settings = await db.getObject(`community:${cid}:slack:notificationSettings`);
            
            // Return default settings if none exist
            if (!settings) {
                return {
                    newTopic: true,        // Enable new topic notifications by default
                    newPost: true,         // Enable new post notifications by default
                    memberJoin: false,     // Disable member join notifications by default
                    memberLeave: false,    // Disable member leave notifications by default
                    updatedAt: new Date().toISOString()
                };
            }
            
            return settings;
        } catch (err) {
            winston.error(`[plugin/caiz] Error getting Slack notification settings for community ${cid}: ${err.message}`);
            // Return default settings on error
            return {
                newTopic: true,
                newPost: true,
                memberJoin: false,
                memberLeave: false,
                updatedAt: new Date().toISOString()
            };
        }
    }

    async saveNotificationSettings(cid, settings) {
        try {
            const db = require.main.require('./src/database');
            
            // Validate settings
            const validatedSettings = {
                newTopic: !!settings.newTopic,
                newPost: !!settings.newPost,
                memberJoin: !!settings.memberJoin,
                memberLeave: !!settings.memberLeave,
                updatedAt: new Date().toISOString()
            };
            
            await db.setObject(`community:${cid}:slack:notificationSettings`, validatedSettings);
            winston.info(`[plugin/caiz] Slack notification settings saved for community ${cid}`);
            
            return { success: true };
        } catch (err) {
            winston.error(`[plugin/caiz] Error saving Slack notification settings for community ${cid}: ${err.message}`);
            throw err;
        }
    }
}

module.exports = new CommunitySlackSettings();