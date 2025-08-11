'use strict';

const ContentAnalyzer = require('../core/analyzer');
const winston = require.main.require('winston');

const analyzer = new ContentAnalyzer();

const topicsHooks = {
    // 新規トピック作成時のフック
    async moderateTopicCreate(hookData) {
        winston.info('[ai-moderation] Topic create hook triggered', {
            content: hookData.title?.substring(0, 50) || 'no title'
        });
        
        // フィルター処理のログ
        winston.info('[ai-moderation] Applying topic create filter');
        
        try {
            // タイトルとコンテンツを結合してモデレーション
            const combinedContent = `${hookData.title}\n\n${hookData.content || ''}`;

            const analysisResult = await analyzer.analyzeContent({
                content: combinedContent,
                contentType: 'topic',
                contentId: hookData.tid || 'new',
                uid: hookData.uid
            });

            // リジェクトの場合、トピックを削除フラグを立てる
            if (analysisResult.action === 'rejected') {
                hookData.deleted = 1;
            }

            return hookData;

        } catch (error) {
            winston.error('[ai-moderation] Topic moderation failed', {
                error: error.message,
                uid: hookData.uid
            });
            return hookData;
        }
    },

    // トピック編集時のフック
    async moderateTopicEdit(hookData) {
        if (!hookData.title) {
            return hookData;
        }

        try {
            const analysisResult = await analyzer.analyzeContent({
                content: hookData.title,
                contentType: 'topic',
                contentId: hookData.tid,
                uid: hookData.uid
            });

            // リジェクトの場合、編集を無効化
            if (analysisResult.action === 'rejected') {
                delete hookData.title;
            }

            return hookData;

        } catch (error) {
            winston.error('[ai-moderation] Topic edit moderation failed', {
                error: error.message,
                tid: hookData.tid
            });
            return hookData;
        }
    }
};

module.exports = topicsHooks;