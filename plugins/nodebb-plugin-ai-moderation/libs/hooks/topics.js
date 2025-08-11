'use strict';

const ContentAnalyzer = require('../core/analyzer');
const logger = require.main.require('./src/logger');

const analyzer = new ContentAnalyzer();

const topicsHooks = {
    // 新規トピック作成時のフック（Pre-save filter）
    async moderateTopicCreate(hookData) {
        try {
            logger.info('[ai-moderation] Moderating new topic', { 
                uid: hookData.uid,
                cid: hookData.cid 
            });

            // タイトルとコンテンツを結合してモデレーション
            const combinedContent = `${hookData.title}\n\n${hookData.content || ''}`;

            const analysisResult = await analyzer.analyzeContent({
                content: combinedContent,
                contentType: 'topic',
                contentId: hookData.tid || 'new',
                cid: hookData.cid,
                uid: hookData.uid
            });

            // アクションに基づいてhookDataを変更
            if (analysisResult.action === 'rejected') {
                hookData.title = '[Topic rejected by AI moderation]';
                hookData.content = '[Content rejected by AI moderation]';
                hookData.deleted = 1;
            } else if (analysisResult.action === 'flagged') {
                await addTopicToModerationQueue(hookData, analysisResult);
            }

            return hookData;

        } catch (error) {
            logger.error('[ai-moderation] Topic moderation failed', {
                error: error.message,
                uid: hookData.uid
            });

            // エラーが発生しても投稿を通す（フェイルセーフ）
            return hookData;
        }
    },

    // トピック編集時のフック（Pre-save filter）
    async moderateTopicEdit(hookData) {
        // タイトルが変更された場合のみモデレーション
        if (!hookData.title) {
            return hookData;
        }

        try {
            logger.info('[ai-moderation] Moderating edited topic title', { 
                tid: hookData.tid,
                uid: hookData.uid 
            });

            const analysisResult = await analyzer.analyzeContent({
                content: hookData.title,
                contentType: 'topic',
                contentId: hookData.tid,
                cid: hookData.cid,
                uid: hookData.uid
            });

            // 編集時のアクション処理
            if (analysisResult.action === 'rejected') {
                // 編集を拒否（タイトル変更を無効化）
                delete hookData.title;
            }

            return hookData;

        } catch (error) {
            logger.error('[ai-moderation] Topic edit moderation failed', {
                error: error.message,
                tid: hookData.tid,
                uid: hookData.uid
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
            try {
                // トピック全体を削除（システムユーザー権限で）
                await topics.delete(topic.tid, 0);
            } catch (deleteError) {
                logger.error('[ai-moderation] Failed to delete topic', {
                    tid: topic.tid,
                    error: deleteError.message
                });
            }
            
            // ユーザーに通知（国際化対応）
            const note = await notifications.create({
                type: 'ai-moderation-topic-rejected',
                nid: `ai-moderation-topic-rejected-${topic.tid}`,
                from: 'system',
                to: topic.uid,
                subject: '[[ai-moderation:notify.topic-rejected.subject]]',
                bodyShort: '[[ai-moderation:notify.topic-rejected.bodyShort]]',
                path: `/topic/${topic.tid}`,
                importance: 5
            });
            
            // 通知を送信
            await notifications.push(note, [topic.uid]);

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
        const note = await notifications.create({
            type: 'ai-moderation-topic-edit-rejected',
            nid: `ai-moderation-topic-edit-rejected-${topic.tid}`,
            from: 'system',
            to: topic.uid || topic.userId,
            subject: '[[ai-moderation:notify.topic-edit-rejected.subject]]',
            bodyShort: '[[ai-moderation:notify.topic-edit-rejected.bodyShort]]',
            path: `/topic/${topic.tid}`,
            importance: 5
        });
        
        // 通知を送信
        await notifications.push(note, [topic.uid || topic.userId]);

        logger.warn('[ai-moderation] Topic edit rejected', {
            tid: topic.tid,
            uid: topic.uid || topic.userId,
            score: analysisResult.score
        });
    }
}

// トピックをモデレーションキューに追加
async function addTopicToModerationQueue(hookData, analysisResult) {
    const db = require.main.require('./src/database');
    
    const queueData = {
        tid: hookData.tid || 'pending',
        uid: hookData.uid,
        cid: hookData.cid,
        title: hookData.title,
        content: hookData.content,
        score: analysisResult.score,
        categories: analysisResult.categories,
        logId: analysisResult.logId,
        createdAt: Date.now(),
        status: 'pending',
        type: 'topic'
    };

    const queueKey = hookData.tid || `temp-topic-${Date.now()}`;
    await db.setObject(`ai-moderation:queue:topic:${queueKey}`, queueData);
    await db.sortedSetAdd('ai-moderation:queue:topics', Date.now(), queueKey);

    // カテゴリ別キューにも追加
    await db.sortedSetAdd(`ai-moderation:queue:topics:cid:${hookData.cid}`, Date.now(), queueKey);
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
    
    const moderationLogger = new ModerationLogger();
    
    try {
        const queueData = await db.getObject(`ai-moderation:queue:topic:${tid}`);
        
        if (!queueData) {
            throw new Error(`Topic ${tid} not found in moderation queue`);
        }

        // ログを更新
        if (queueData.logId) {
            await moderationLogger.updateLogReview(queueData.logId, reviewerUid, action);
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

        logger.info('[ai-moderation] Topic review completed', {
            tid,
            action,
            reviewerUid,
            logId: queueData.logId
        });

        return { success: true };

    } catch (error) {
        logger.error('[ai-moderation] Topic review failed', {
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