'use strict';

const ContentAnalyzer = require('../core/analyzer');
const winston = require.main.require('winston');

const analyzer = new ContentAnalyzer();

const postsHooks = {
    // 新規投稿作成時のフック
    async moderatePostCreate(hookData) {
        try {
            const analysisResult = await analyzer.analyzeContent({
                content: hookData.content,
                contentType: 'post',
                contentId: hookData.pid || 'new',
                uid: hookData.uid
            });

            // リジェクトの場合、投稿を削除フラグを立てる
            if (analysisResult.action === 'rejected') {
                hookData.deleted = 1;
            }

            return hookData;

        } catch (error) {
            winston.error('[ai-moderation] Post moderation failed', {
                error: error.message,
                uid: hookData.uid
            });
            return hookData;
        }
    },

    // 投稿編集時のフック
    async moderatePostEdit(hookData) {
        try {
            const analysisResult = await analyzer.analyzeContent({
                content: hookData.content,
                contentType: 'post',
                contentId: hookData.pid,
                uid: hookData.uid
            });

            // リジェクトの場合、編集を無効化
            if (analysisResult.action === 'rejected') {
                delete hookData.content;
            }

            return hookData;

        } catch (error) {
            winston.error('[ai-moderation] Post edit moderation failed', {
                error: error.message,
                pid: hookData.pid
            });
            return hookData;
        }
    }
};

module.exports = postsHooks;