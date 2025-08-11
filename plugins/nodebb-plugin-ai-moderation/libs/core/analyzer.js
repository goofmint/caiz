'use strict';

const apiFactory = require('../api');
const settings = require('./settings');
const winston = require.main.require('winston');

class ContentAnalyzer {
    async analyzeContent(contentData) {
        const { content, contentType, contentId, uid } = contentData;

        try {
            // 設定を取得
            const config = await settings.getSettings();
            
            if (!config.enabled) {
                return { action: 'approved' };
            }

            // APIプロバイダを作成
            const moderator = apiFactory.createModerator(
                config.provider,
                config.apiKey
            );

            // コンテンツをモデレート
            const moderationResult = await moderator.moderate(content);

            // アクションを決定
            let action = 'approved';
            if (moderationResult.flagged) {
                if (moderationResult.score >= config.thresholds.reject) {
                    action = 'rejected';
                } else if (moderationResult.score >= config.thresholds.flag) {
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