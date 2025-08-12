'use strict';

const apiFactory = require('../api');
const settings = require('./settings');
const winston = require.main.require('winston');

class ContentAnalyzer {
    async analyzeContent(contentData) {
        const { content, contentType, contentId, uid } = contentData;

        try {
            // コンテンツを安全な文字列に変換し、空の場合は承認
            const safeContent = String(content || '').trim();
            if (!safeContent) {
                return { action: 'approved' };
            }

            // 設定を取得
            const config = await settings.getSettings();
            
            winston.info('[ai-moderation] Config loaded', { 
                enabled: config.enabled,
                thresholds: config.thresholds,
                hasApiKey: !!config.apiKey
            });
            
            if (!config.enabled) {
                return { action: 'approved' };
            }

            // 閾値の安全な取得
            const thresholds = config.thresholds || {};
            const flagThreshold = thresholds.flag ?? 70;
            const rejectThreshold = thresholds.reject ?? 90;
            
            winston.info('[ai-moderation] Using thresholds', { flagThreshold, rejectThreshold });

            // APIプロバイダを作成
            const moderator = apiFactory.createModerator(
                config.provider,
                config.apiKey
            );

            // コンテンツをモデレート
            const moderationResult = await moderator.moderateWithRetry(safeContent);

            // アクションを決定
            let action = 'approved';
            if (moderationResult.flagged) {
                if (moderationResult.score >= rejectThreshold) {
                    action = 'rejected';
                } else if (moderationResult.score >= flagThreshold) {
                    action = 'flagged';
                }
            }

            winston.info(`[ai-moderation] Content analyzed`, {
                contentType,
                contentId,
                uid,
                action,
                score: moderationResult.score
            });

            return {
                score: moderationResult.score,
                flagged: moderationResult.flagged,
                categories: moderationResult.categories,
                action
            };

        } catch (error) {
            winston.error('[ai-moderation] Content analysis failed', {
                error: error.message,
                contentType,
                contentId
            });

            // エラー時は承認（フェイルセーフ）
            return { action: 'approved' };
        }
    }
}

module.exports = ContentAnalyzer;