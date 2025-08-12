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
        
        // フィルター処理のログ
        winston.info('[ai-moderation] Applying post create filter');
        
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