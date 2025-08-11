'use strict';

const ContentAnalyzer = require('../core/analyzer');
const logger = require.main.require('./src/logger');

const analyzer = new ContentAnalyzer();

const topicsHooks = {
    // 新規トピック作成時のフック
    async moderateNewTopic(hookData) {
        const { topic, post } = hookData;
        
        try {
            logger.info('[ai-moderation] Moderating new topic', { 
                tid: topic.tid,
                uid: topic.uid,
                cid: topic.cid 
            });

            // タイトルとコンテンツを結合してモデレーション
            const combinedContent = `${topic.title}\n\n${post.content}`;

            const analysisResult = await analyzer.analyzeContent({
                content: combinedContent,
                contentType: 'topic',
                contentId: topic.tid,
                cid: topic.cid,
                uid: topic.uid
            });

            // アクションに基づいて処理
            await handleTopicModerationAction(topic, post, analysisResult);

            return hookData;

        } catch (error) {
            logger.error('[ai-moderation] Topic moderation failed', {
                error: error.message,
                tid: topic.tid,
                uid: topic.uid
            });

            // エラーが発生しても投稿を通す（フェイルセーフ）
            return hookData;
        }
    },

    // トピック編集時のフック
    async moderateTopicEdit(hookData) {
        const { topic, data } = hookData;
        
        // タイトルが変更された場合のみモデレーション
        if (!data.title || data.title === topic.title) {
            return hookData;
        }

        try {
            logger.info('[ai-moderation] Moderating edited topic title', { 
                tid: topic.tid,
                uid: topic.uid 
            });

            const analysisResult = await analyzer.analyzeContent({
                content: data.title,
                contentType: 'topic',
                contentId: topic.tid,
                cid: topic.cid,
                uid: topic.uid || topic.userId
            });

            // 編集時のアクション処理
            await handleTopicEditModerationAction(topic, data, analysisResult);

            return hookData;

        } catch (error) {
            logger.error('[ai-moderation] Topic edit moderation failed', {
                error: error.message,
                tid: topic.tid,
                uid: topic.uid
            });

            return hookData;
        }
    }
};

// トピックモデレーション結果に基づくアクション処理
async function handleTopicModerationAction(topic, post, analysisResult) {
    const topics = require.main.require('./src/topics');
    const posts = require.main.require('./src/posts');
    const notifications = require.main.require('./src/notifications');

    switch (analysisResult.action) {
        case 'rejected':
            // トピック全体を削除
            await topics.delete(topic.tid);
            
            // ユーザーに通知
            await notifications.create({
                type: 'ai-moderation-topic-rejected',
                nid: `ai-moderation-topic-rejected-${topic.tid}`,
                from: 'system',
                to: topic.uid,
                subject: 'トピックが削除されました',
                bodyShort: 'AIモデレーションにより不適切と判定されたトピックが削除されました。',
                path: `/topic/${topic.tid}`,
                importance: 5
            });

            logger.warn('[ai-moderation] Topic rejected and deleted', {
                tid: topic.tid,
                uid: topic.uid,
                score: analysisResult.score,
                logId: analysisResult.logId
            });
            break;

        case 'flagged':
            // モデレーションキューに追加
            await addTopicToModerationQueue(topic, post, analysisResult);

            logger.info('[ai-moderation] Topic flagged for review', {
                tid: topic.tid,
                uid: topic.uid,
                score: analysisResult.score,
                logId: analysisResult.logId
            });
            break;

        case 'approved':
            logger.info('[ai-moderation] Topic approved', {
                tid: topic.tid,
                uid: topic.uid,
                score: analysisResult.score,
                logId: analysisResult.logId
            });
            break;

        default:
            logger.warn('[ai-moderation] Unknown action result for topic', {
                action: analysisResult.action,
                tid: topic.tid
            });
    }
}

// トピック編集時のモデレーション処理
async function handleTopicEditModerationAction(topic, editData, analysisResult) {
    if (analysisResult.action === 'rejected') {
        // 編集を拒否（元のタイトルを維持）
        editData.title = topic.title;
        
        const notifications = require.main.require('./src/notifications');
        await notifications.create({
            type: 'ai-moderation-topic-edit-rejected',
            nid: `ai-moderation-topic-edit-rejected-${topic.tid}`,
            from: 'system',
            to: topic.uid || topic.userId,
            subject: 'トピックタイトルの編集が拒否されました',
            bodyShort: 'AIモデレーションにより不適切と判定された編集が拒否されました。',
            path: `/topic/${topic.tid}`,
            importance: 5
        });

        logger.warn('[ai-moderation] Topic edit rejected', {
            tid: topic.tid,
            uid: topic.uid || topic.userId,
            score: analysisResult.score
        });
    }
}

// トピックをモデレーションキューに追加
async function addTopicToModerationQueue(topic, post, analysisResult) {
    const db = require.main.require('./src/database');
    
    const queueData = {
        tid: topic.tid,
        pid: post.pid,
        uid: topic.uid,
        cid: topic.cid,
        title: topic.title,
        content: post.content,
        score: analysisResult.score,
        categories: analysisResult.categories,
        logId: analysisResult.logId,
        createdAt: Date.now(),
        status: 'pending',
        type: 'topic'
    };

    await db.setObject(`ai-moderation:queue:topic:${topic.tid}`, queueData);
    await db.sortedSetAdd('ai-moderation:queue:topics', Date.now(), topic.tid);

    // カテゴリ別キューにも追加
    await db.sortedSetAdd(`ai-moderation:queue:topics:cid:${topic.cid}`, Date.now(), topic.tid);
}

// キューからのトピック削除処理
async function removeTopicFromQueue(tid) {
    const db = require.main.require('./src/database');
    
    // キューからトピックデータを取得
    const queueData = await db.getObject(`ai-moderation:queue:topic:${tid}`);
    
    if (queueData) {
        // 各キューから削除
        await Promise.all([
            db.delete(`ai-moderation:queue:topic:${tid}`),
            db.sortedSetRemove('ai-moderation:queue:topics', tid),
            db.sortedSetRemove(`ai-moderation:queue:topics:cid:${queueData.cid}`, tid)
        ]);
    }
}

// 管理者によるトピック承認/拒否処理
async function reviewTopic(tid, action, reviewerUid) {
    const db = require.main.require('./src/database');
    const topics = require.main.require('./src/topics');
    const ModerationLogger = require('../core/logger');
    
    const logger = new ModerationLogger();
    
    try {
        const queueData = await db.getObject(`ai-moderation:queue:topic:${tid}`);
        
        if (!queueData) {
            throw new Error(`Topic ${tid} not found in moderation queue`);
        }

        // ログを更新
        if (queueData.logId) {
            await logger.updateLogReview(queueData.logId, reviewerUid, action);
        }

        switch (action) {
            case 'approved':
                // キューから削除（トピックは既に公開済み）
                await removeTopicFromQueue(tid);
                break;

            case 'rejected':
                // トピックを削除
                await topics.delete(tid);
                await removeTopicFromQueue(tid);
                break;

            default:
                throw new Error(`Unknown review action: ${action}`);
        }

        logger.logger.info('[ai-moderation] Topic review completed', {
            tid,
            action,
            reviewerUid,
            logId: queueData.logId
        });

        return { success: true };

    } catch (error) {
        logger.logger.error('[ai-moderation] Topic review failed', {
            error: error.message,
            tid,
            action,
            reviewerUid
        });
        throw error;
    }
}

module.exports = {
    ...topicsHooks,
    reviewTopic,
    removeTopicFromQueue
};