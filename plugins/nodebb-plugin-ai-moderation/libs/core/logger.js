'use strict';

const db = require.main.require('./src/database');

// モデレーションログのデータ構造
class ModerationLogger {
    constructor() {
        this.crypto = require.main.require('crypto');
        this.logger = require.main.require('./src/logger');
        
        // 設定可能な制限値
        this.config = {
            maxContentLength: 2048,      // コンテンツの最大バイト数
            maxApiResponseLength: 4096,  // APIレスポンスの最大バイト数
            maxCategoriesLength: 1024,   // カテゴリの最大バイト数
            logRetentionDays: 90,        // ログ保持期間（日数）
            enableContentHashing: true,  // コンテンツハッシュ化を有効にする
        };
        
        // 機密情報を含む可能性のあるキー
        this.sensitiveKeys = [
            'token', 'key', 'secret', 'password', 'credential',
            'authorization', 'auth', 'api_key', 'apikey',
            'access_token', 'refresh_token', 'bearer'
        ];
    }
    
    async logModeration(data) {
        try {
            // ユニークIDを生成
            const logId = await db.incrObjectField('global', 'nextAiModerationLogId');
            
            // データのサニタイゼーションとセキュリティ処理
            const sanitizedData = await this.sanitizeLogData(data);
            
            // TTL設定（保持期間）
            const ttlSeconds = this.config.logRetentionDays * 24 * 60 * 60;
            
            // ログエントリを作成
            const logEntry = {
                id: logId,
                contentType: sanitizedData.contentType,
                contentId: sanitizedData.contentId,
                cid: sanitizedData.cid,
                uid: sanitizedData.uid,
                content: sanitizedData.content,
                contentHash: sanitizedData.contentHash,
                apiProvider: sanitizedData.apiProvider,
                apiResponse: sanitizedData.apiResponse,
                apiResponseHash: sanitizedData.apiResponseHash,
                score: sanitizedData.score,
                categories: sanitizedData.categories,
                actionTaken: sanitizedData.actionTaken,
                reviewedBy: sanitizedData.reviewedBy || null,
                reviewedAt: sanitizedData.reviewedAt || null,
                createdAt: Date.now(),
                truncated: sanitizedData.truncated || {},
                redacted: sanitizedData.redacted || false
            };
            
            // ログエントリを保存（TTL付き）
            const logKey = `ai-moderation:log:${logId}`;
            await db.setObject(logKey, logEntry);
            await db.expire(logKey, ttlSeconds);
            
            // インデックス用のソート済みセットに追加（TTL付き）
            const indexPromises = [
                // 時系列インデックス
                this.addToIndexWithTTL('ai-moderation:logs:timestamp', logEntry.createdAt, logId, ttlSeconds),
                
                // カテゴリ別インデックス
                this.addToIndexWithTTL(`ai-moderation:logs:cid:${data.cid}`, logEntry.createdAt, logId, ttlSeconds),
                
                // ユーザー別インデックス
                this.addToIndexWithTTL(`ai-moderation:logs:uid:${data.uid}`, logEntry.createdAt, logId, ttlSeconds),
                
                // アクション別インデックス
                this.addToIndexWithTTL(`ai-moderation:logs:action:${data.actionTaken}`, logEntry.createdAt, logId, ttlSeconds),
                
                // コンテンツタイプ別インデックス
                this.addToIndexWithTTL(`ai-moderation:logs:type:${data.contentType}`, logEntry.createdAt, logId, ttlSeconds)
            ];
            
            await Promise.all(indexPromises);
            
            // クリーンアップキューに追加（バックアップ削除メカニズム）
            await this.scheduleCleanup(logId, ttlSeconds);
            
            // テレメトリ：切り捨てや編集が発生した場合の警告
            if (sanitizedData.truncated && Object.keys(sanitizedData.truncated).length > 0) {
                this.logger.warn('[ai-moderation] Data truncated in log entry', {
                    logId,
                    truncated: sanitizedData.truncated
                });
            }
            
            if (sanitizedData.redacted) {
                this.logger.warn('[ai-moderation] Sensitive data redacted in log entry', {
                    logId,
                    provider: sanitizedData.apiProvider
                });
            }
            
            return logId;
            
        } catch (error) {
            this.logger.error('[ai-moderation] Failed to log moderation data', { error: error.message, data: data });
            throw error;
        }
    }
    
    async sanitizeLogData(data) {
        const result = { truncated: {}, redacted: false };
        
        // 1. サイズ制限とトランケーション
        result.content = this.truncateString(data.content, this.config.maxContentLength, 'content', result.truncated);
        result.categories = this.truncateString(
            typeof data.categories === 'object' ? JSON.stringify(data.categories) : data.categories,
            this.config.maxCategoriesLength,
            'categories',
            result.truncated
        );
        
        // 2. APIレスポンスのサニタイゼーション
        const sanitizedApiResponse = await this.sanitizeApiResponse(data.apiResponse);
        result.apiResponse = this.truncateString(
            sanitizedApiResponse.data,
            this.config.maxApiResponseLength,
            'apiResponse',
            result.truncated
        );
        result.redacted = sanitizedApiResponse.redacted;
        
        // 3. ハッシュ生成（オプション）
        if (this.config.enableContentHashing) {
            result.contentHash = this.generateHash(data.content);
            result.apiResponseHash = this.generateHash(JSON.stringify(data.apiResponse));
        }
        
        // 4. その他のフィールドをコピー
        result.contentType = data.contentType;
        result.contentId = data.contentId;
        result.cid = data.cid;
        result.uid = data.uid;
        result.apiProvider = data.apiProvider;
        result.score = data.score;
        result.actionTaken = data.actionTaken;
        result.reviewedBy = data.reviewedBy;
        result.reviewedAt = data.reviewedAt;
        
        return result;
    }
    
    truncateString(str, maxBytes, fieldName, truncatedLog) {
        if (!str) return str;
        
        const buffer = Buffer.from(str, 'utf8');
        if (buffer.length <= maxBytes) return str;
        
        // バイト制限を超える場合、切り捨て
        const truncated = buffer.subarray(0, maxBytes - 3).toString('utf8') + '...';
        truncatedLog[fieldName] = {
            originalSize: buffer.length,
            truncatedSize: maxBytes,
            truncated: true
        };
        
        return truncated;
    }
    
    async sanitizeApiResponse(apiResponse) {
        if (!apiResponse || typeof apiResponse !== 'object') {
            return { data: JSON.stringify(apiResponse), redacted: false };
        }
        
        let redacted = false;
        
        // 再帰的に機密情報をチェック・削除
        const sanitizeObject = (obj) => {
            if (typeof obj !== 'object' || obj === null) return obj;
            
            if (Array.isArray(obj)) {
                return obj.map(sanitizeObject);
            }
            
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                const lowerKey = key.toLowerCase();
                
                // 機密情報のキーをチェック
                const isSensitive = this.sensitiveKeys.some(sensitiveKey => 
                    lowerKey.includes(sensitiveKey)
                );
                
                if (isSensitive) {
                    sanitized[key] = '[REDACTED]';
                    redacted = true;
                } else if (typeof value === 'object') {
                    sanitized[key] = sanitizeObject(value);
                } else if (typeof value === 'string' && value.length > 1000) {
                    // 非常に長い文字列も潜在的に機密情報の可能性がある
                    sanitized[key] = value.substring(0, 100) + '[...TRUNCATED]';
                    redacted = true;
                } else {
                    sanitized[key] = value;
                }
            }
            
            return sanitized;
        };
        
        const sanitizedResponse = sanitizeObject(apiResponse);
        return {
            data: JSON.stringify(sanitizedResponse),
            redacted
        };
    }
    
    generateHash(data) {
        if (!data) return null;
        return this.crypto.createHash('sha256')
            .update(typeof data === 'string' ? data : JSON.stringify(data))
            .digest('hex');
    }
    
    async addToIndexWithTTL(indexKey, score, member, ttlSeconds) {
        await db.sortedSetAdd(indexKey, score, member);
        await db.expire(indexKey, ttlSeconds);
    }
    
    async scheduleCleanup(logId, ttlSeconds) {
        // クリーンアップキューに追加（バックアップ削除メカニズム）
        const cleanupTime = Date.now() + (ttlSeconds * 1000);
        await db.sortedSetAdd('ai-moderation:cleanup:queue', cleanupTime, logId);
        
        // クリーンアップキューにもTTLを設定（少し長めに）
        await db.expire('ai-moderation:cleanup:queue', ttlSeconds + 86400); // +1日
    }
    
    async getLogsByCategory(cid, start = 0, stop = -1) {
        const logIds = await db.getSortedSetRevRange(`ai-moderation:logs:cid:${cid}`, start, stop);
        return await this.getLogsById(logIds);
    }
    
    async getLogsByUser(uid, start = 0, stop = -1) {
        const logIds = await db.getSortedSetRevRange(`ai-moderation:logs:uid:${uid}`, start, stop);
        return await this.getLogsById(logIds);
    }
    
    async getLogsByAction(action, start = 0, stop = -1) {
        const logIds = await db.getSortedSetRevRange(`ai-moderation:logs:action:${action}`, start, stop);
        return await this.getLogsById(logIds);
    }
    
    async getRecentLogs(start = 0, stop = 19) {
        const logIds = await db.getSortedSetRevRange('ai-moderation:logs:timestamp', start, stop);
        return await this.getLogsById(logIds);
    }
    
    async getLogsById(logIds) {
        if (!logIds || logIds.length === 0) return [];
        
        const keys = logIds.map(id => `ai-moderation:log:${id}`);
        const logs = await db.getObjects(keys);
        
        return logs.map(log => {
            if (log) {
                // JSONフィールドをパース
                log.apiResponse = log.apiResponse ? JSON.parse(log.apiResponse) : null;
                log.categories = log.categories ? JSON.parse(log.categories) : null;
                log.createdAt = parseInt(log.createdAt);
                log.reviewedAt = log.reviewedAt ? parseInt(log.reviewedAt) : null;
            }
            return log;
        }).filter(Boolean);
    }
    
    async getLogStats(cid = null, days = 30) {
        const since = Date.now() - (days * 24 * 60 * 60 * 1000);
        const baseKey = cid ? `ai-moderation:logs:cid:${cid}` : 'ai-moderation:logs:timestamp';
        
        // 指定期間内のログIDを取得
        const logIds = await db.getSortedSetRangeByScore(baseKey, since, Date.now());
        
        if (logIds.length === 0) {
            return { total: 0, approved: 0, flagged: 0, rejected: 0, avgScore: 0 };
        }
        
        const logs = await this.getLogsById(logIds);
        const stats = logs.reduce((acc, log) => {
            acc.total++;
            acc[log.actionTaken] = (acc[log.actionTaken] || 0) + 1;
            acc.totalScore += log.score || 0;
            return acc;
        }, { total: 0, approved: 0, flagged: 0, rejected: 0, totalScore: 0 });
        
        stats.avgScore = stats.total > 0 ? Math.round(stats.totalScore / stats.total) : 0;
        delete stats.totalScore;
        
        return stats;
    }
    
    async updateLogReview(logId, reviewedBy, action, reviewedAt = Date.now()) {
        // 既存のログを読み込んで現在の状態を取得
        const existingLog = await db.getObject(`ai-moderation:log:${logId}`);
        if (!existingLog) {
            throw new Error(`Log entry ${logId} not found`);
        }
        
        // 既存のアクションとタイムスタンプを保存
        const oldAction = existingLog.actionTaken;
        const createdAt = parseInt(existingLog.createdAt);
        
        // ログを更新
        const updates = {
            actionTaken: action,
            reviewedBy: reviewedBy,
            reviewedAt: reviewedAt
        };
        await db.setObject(`ai-moderation:log:${logId}`, updates);
        
        // アクションインデックスを更新
        if (oldAction !== action) {
            // 古いアクションインデックスから削除
            await db.sortedSetRemove(`ai-moderation:logs:action:${oldAction}`, logId);
            // 新しいアクションインデックスに追加
            await db.sortedSetAdd(`ai-moderation:logs:action:${action}`, createdAt, logId);
        }
    }
    
    // 期限切れログの定期クリーンアップジョブ
    async performCleanup() {
        try {
            const now = Date.now();
            
            // 期限切れのログIDを取得
            const expiredLogIds = await db.getSortedSetRangeByScore(
                'ai-moderation:cleanup:queue', 
                0, 
                now
            );
            
            if (expiredLogIds.length === 0) return { cleaned: 0 };
            
            this.logger.info('[ai-moderation] Starting cleanup of expired logs', { 
                count: expiredLogIds.length 
            });
            
            let cleaned = 0;
            for (const logId of expiredLogIds) {
                try {
                    // ログエントリとインデックスを削除
                    await this.cleanupLogEntry(logId);
                    
                    // クリーンアップキューから削除
                    await db.sortedSetRemove('ai-moderation:cleanup:queue', logId);
                    
                    cleaned++;
                } catch (error) {
                    this.logger.error('[ai-moderation] Failed to cleanup log entry', { 
                        logId, 
                        error: error.message 
                    });
                }
            }
            
            this.logger.info('[ai-moderation] Cleanup completed', { cleaned });
            return { cleaned };
            
        } catch (error) {
            this.logger.error('[ai-moderation] Cleanup job failed', { error: error.message });
            throw error;
        }
    }
    
    async cleanupLogEntry(logId) {
        // ログデータを取得してインデックスから削除
        const log = await db.getObject(`ai-moderation:log:${logId}`);
        
        if (log) {
            // 各インデックスから削除
            const cleanupPromises = [
                db.sortedSetRemove('ai-moderation:logs:timestamp', logId),
                db.sortedSetRemove(`ai-moderation:logs:cid:${log.cid}`, logId),
                db.sortedSetRemove(`ai-moderation:logs:uid:${log.uid}`, logId),
                db.sortedSetRemove(`ai-moderation:logs:action:${log.actionTaken}`, logId),
                db.sortedSetRemove(`ai-moderation:logs:type:${log.contentType}`, logId)
            ];
            
            await Promise.all(cleanupPromises);
        }
        
        // ログエントリを削除
        await db.delete(`ai-moderation:log:${logId}`);
    }
    
    // 設定の更新（管理画面から呼び出し可能）
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('[ai-moderation] Configuration updated', { config: this.config });
    }
    
    // セキュリティ設定の更新
    updateSensitiveKeys(newKeys) {
        this.sensitiveKeys = [...new Set([...this.sensitiveKeys, ...newKeys])];
        this.logger.info('[ai-moderation] Sensitive keys updated', { 
            count: this.sensitiveKeys.length 
        });
    }
}

module.exports = ModerationLogger;