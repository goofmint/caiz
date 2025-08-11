'use strict';

const apiFactory = require('../api');
const settings = require('./settings');
const ModerationLogger = require('./logger');
const logger = require.main.require('./src/logger');

class ContentAnalyzer {
    constructor() {
        this.moderationLogger = new ModerationLogger();
        this.circuitBreaker = new CircuitBreaker();
    }

    async analyzeContent(contentData) {
        const { content, contentType, contentId, cid, uid } = contentData;

        try {
            // 設定を取得
            const config = await settings.getSettings();
            const apiKey = await settings.getApiKey();

            if (!apiKey) {
                throw new Error('AI moderation API key not configured');
            }

            // プロバイダーを取得（デフォルトはOpenAI）
            const provider = config.provider || 'openai';
            
            // サーキットブレーカーチェック
            if (this.circuitBreaker.isOpen()) {
                logger.warn('[ai-moderation] Circuit breaker is open, skipping AI moderation');
                return this.createFallbackResponse(contentData, 'circuit-breaker-open');
            }

            // AI モデレーターを作成
            const moderator = apiFactory.createModerator(provider, apiKey);

            // コンテンツをモデレーション
            const moderationResult = await moderator.moderateWithRetry(content);

            // サーキットブレーカーをリセット（成功時）
            this.circuitBreaker.onSuccess();

            // アクションを決定
            const action = this.determineAction(moderationResult.score, config);

            // ログに記録
            const logData = {
                contentType,
                contentId,
                cid,
                uid,
                content,
                apiProvider: provider,
                apiResponse: moderationResult.raw,
                score: moderationResult.score,
                categories: moderationResult.categories,
                actionTaken: action
            };

            const logId = await this.moderationLogger.logModeration(logData);

            return {
                logId,
                score: moderationResult.score,
                flagged: moderationResult.flagged,
                categories: moderationResult.categories,
                action,
                provider
            };

        } catch (error) {
            // サーキットブレーカーに失敗を記録
            this.circuitBreaker.onFailure();

            logger.error('[ai-moderation] Content analysis failed', {
                error: error.message,
                contentType,
                contentId,
                uid
            });

            // フォールバック応答を返す
            return this.createFallbackResponse(contentData, error.message);
        }
    }

    determineAction(score, config) {
        const thresholds = {
            flagThreshold: config.thresholdFlag || 70,
            rejectThreshold: config.thresholdReject || 90
        };

        if (score >= thresholds.rejectThreshold) {
            return 'rejected';
        } else if (score >= thresholds.flagThreshold) {
            return 'flagged';
        } else {
            return 'approved';
        }
    }

    createFallbackResponse(contentData, reason) {
        const { contentType, contentId, cid, uid } = contentData;

        logger.info('[ai-moderation] Using fallback response', {
            reason,
            contentType,
            contentId,
            uid
        });

        return {
            logId: null,
            score: 0,
            flagged: false,
            categories: {},
            action: 'approved', // フォールバック時は承認
            provider: 'fallback',
            fallbackReason: reason
        };
    }

    async analyzeBatch(contentDataArray) {
        const results = [];

        for (const contentData of contentDataArray) {
            try {
                const result = await this.analyzeContent(contentData);
                results.push(result);
            } catch (error) {
                logger.error('[ai-moderation] Batch analysis failed for item', {
                    error: error.message,
                    contentId: contentData.contentId
                });

                results.push(this.createFallbackResponse(contentData, error.message));
            }
        }

        return results;
    }
}

// サーキットブレーカーパターンの実装
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000; // 1分
        this.state = 'closed'; // closed, open, half-open
        this.failureCount = 0;
        this.lastFailureTime = null;
    }

    isOpen() {
        if (this.state === 'open') {
            // タイムアウト後にhalf-openに移行
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = 'half-open';
                return false;
            }
            return true;
        }
        return false;
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'closed';
        this.lastFailureTime = null;
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'open';
            logger.warn('[ai-moderation] Circuit breaker opened due to failures', {
                failureCount: this.failureCount,
                threshold: this.failureThreshold
            });
        }
    }

    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
        };
    }
}

module.exports = ContentAnalyzer;