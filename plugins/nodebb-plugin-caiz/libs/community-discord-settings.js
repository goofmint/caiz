const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const meta = require.main.require('./src/meta');
const crypto = require('crypto');

class CommunityDiscordSettings {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.encryptionKey = null;
    }
    
    async getEncryptionKey() {
        if (!this.encryptionKey) {
            // 暗号化キーを取得または生成
            let key = await meta.settings.getOne('caiz', 'encryptionKey');
            if (!key) {
                key = crypto.randomBytes(32).toString('hex');
                await meta.settings.setOne('caiz', 'encryptionKey', key);
            }
            this.encryptionKey = Buffer.from(key, 'hex');
        }
        return this.encryptionKey;
    }
    
    encrypt(text) {
        if (!text) return null;
        
        try {
            const key = this.encryptionKey || Buffer.from('default-key-should-be-replaced!!', 'utf8');
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return iv.toString('hex') + ':' + encrypted;
        } catch (err) {
            winston.error(`[plugin/caiz] Error encrypting text: ${err.message}`);
            return null;
        }
    }
    
    decrypt(encryptedText) {
        if (!encryptedText) return null;
        
        try {
            const key = this.encryptionKey || Buffer.from('default-key-should-be-replaced!!', 'utf8');
            const parts = encryptedText.split(':');
            if (parts.length !== 2) return null;
            
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (err) {
            winston.error(`[plugin/caiz] Error decrypting text: ${err.message}`);
            return null;
        }
    }
    
    async saveSettings(cid, settings) {
        try {
            await this.getEncryptionKey();
            
            // アクセストークンとリフレッシュトークンを暗号化
            const encryptedSettings = {
                ...settings,
                accessToken: this.encrypt(settings.accessToken),
                refreshToken: settings.refreshToken ? this.encrypt(settings.refreshToken) : null
            };
            
            // データベースに保存
            await db.setObject(`community:${cid}:discord:settings`, encryptedSettings);
            
            winston.info(`[plugin/caiz] Discord settings saved for community ${cid}`);
            return true;
        } catch (err) {
            winston.error(`[plugin/caiz] Error saving Discord settings for community ${cid}: ${err.message}`);
            throw err;
        }
    }
    
    async getSettings(cid) {
        try {
            await this.getEncryptionKey();
            
            const settings = await db.getObject(`community:${cid}:discord:settings`);
            if (!settings) {
                return null;
            }
            
            // トークンを復号化
            if (settings.accessToken) {
                settings.accessToken = this.decrypt(settings.accessToken);
            }
            if (settings.refreshToken) {
                settings.refreshToken = this.decrypt(settings.refreshToken);
            }
            
            return settings;
        } catch (err) {
            winston.error(`[plugin/caiz] Error getting Discord settings for community ${cid}: ${err.message}`);
            return null;
        }
    }
    
    async deleteSettings(cid) {
        try {
            await db.delete(`community:${cid}:discord:settings`);
            winston.info(`[plugin/caiz] Discord settings deleted for community ${cid}`);
            return true;
        } catch (err) {
            winston.error(`[plugin/caiz] Error deleting Discord settings for community ${cid}: ${err.message}`);
            throw err;
        }
    }
    
    async getPublicInfo(cid) {
        try {
            const settings = await db.getObject(`community:${cid}:discord:settings`);
            if (!settings) {
                return null;
            }
            
            // トークンを除外した公開情報のみ返す
            return {
                guildId: settings.guildId,
                guildName: settings.guildName,
                username: settings.username,
                connectedAt: settings.connectedAt,
                hasWebhook: !!settings.webhook
            };
        } catch (err) {
            winston.error(`[plugin/caiz] Error getting Discord public info for community ${cid}: ${err.message}`);
            return null;
        }
    }
}

module.exports = new CommunityDiscordSettings();