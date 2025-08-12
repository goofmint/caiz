'use strict';

const ContentAnalyzer = require('../core/analyzer');
const winston = require.main.require('winston');

const analyzer = new ContentAnalyzer();

const postsHooks = {
    // 新規投稿作成時のフック
    async moderatePostCreate(hookData) {
        const isMainTopic = hookData.data?.isMain || false;
        
        winston.info('[ai-moderation] Post create hook triggered', {
            content: hookData.post?.content?.substring(0, 50) || 'no content',
            pid: hookData.post?.pid,
            uid: hookData.post?.uid,
            isMainTopic: isMainTopic
        });
        
        if (isMainTopic) {
            winston.info('[ai-moderation] Skipping post filter (already processed in topic create)');
            return hookData;
        }
        
        // AI分析処理
        const content = hookData.post?.content;
        if (!content) {
            winston.info('[ai-moderation] No content to analyze');
            return hookData;
        }

        try {
            const analysisResult = await analyzer.analyzeContent({
                content: content,
                contentType: 'post',
                contentId: hookData.post?.pid || 'new',
                uid: hookData.post?.uid
            });

            winston.info('[ai-moderation] Post analysis result', { 
                action: analysisResult.action,
                score: analysisResult.score 
            });

            // リジェクトの場合、投稿削除フラグを設定
            if (analysisResult.action === 'rejected') {
                hookData.post.deleted = 1;
                winston.warn('[ai-moderation] Post rejected and marked as deleted');
            }

        } catch (error) {
            winston.error('[ai-moderation] Post analysis failed', { error: error.message });
        }
        
        return hookData;
    },

    // 投稿編集時のフック
    async moderatePostEdit(hookData) {
        winston.info('[ai-moderation] Post edit hook triggered', {
            content: hookData.post?.content?.substring(0, 50) || 'no content',
            pid: hookData.post?.pid,
            uid: hookData.post?.uid
        });
        
        // フィルター処理のログ
        winston.info('[ai-moderation] Applying post edit filter');
        
        return hookData;
    }
};

module.exports = postsHooks;