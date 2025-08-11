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
        
        return hookData;
    },

    // トピック編集時のフック
    async moderateTopicEdit(hookData) {
        if (!hookData.title) {
            return hookData;
        }

        winston.info('[ai-moderation] Topic edit hook triggered', {
            content: hookData.title?.substring(0, 50) || 'no title'
        });
        
        // フィルター処理のログ
        winston.info('[ai-moderation] Applying topic edit filter');

        return hookData;
    }
};

module.exports = topicsHooks;