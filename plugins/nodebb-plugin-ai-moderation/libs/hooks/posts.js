'use strict';

const ContentAnalyzer = require('../core/analyzer');
const logger = require.main.require('./src/logger');

const analyzer = new ContentAnalyzer();

const postsHooks = {
    // 新規投稿作成時のフック
    async moderateNewPost(hookData) {
        const { post } = hookData;
        
        try {
            logger.info('[ai-moderation] Moderating new post', { 
                pid: post.pid,
                uid: post.uid,
                cid: post.cid 
            });

            const analysisResult = await analyzer.analyzeContent({
                content: post.content,
                contentType: 'post',
                contentId: post.pid,
                cid: post.cid,
                uid: post.uid
            });

            // アクションに基づいて処理
            await handleModerationAction(post, analysisResult);

            return hookData;

        } catch (error) {
            logger.error('[ai-moderation] Post moderation failed', {
                error: error.message,
                pid: post.pid,
                uid: post.uid
            });

            // エラーが発生しても投稿を通す（フェイルセーフ）
            return hookData;
        }
    },

    // 投稿編集時のフック
    async moderatePostEdit(hookData) {
        const { post, data } = hookData;
        
        // 編集内容が含まれている場合のみモデレーション
        if (!data.content || data.content === post.content) {
            return hookData;
        }

        try {
            logger.info('[ai-moderation] Moderating edited post', { 
                pid: post.pid,
                uid: post.uid 
            });

            const analysisResult = await analyzer.analyzeContent({
                content: data.content,
                contentType: 'post',
                contentId: post.pid,
                cid: post.cid,
                uid: post.uid
            });

            // 編集時のアクション処理
            await handleEditModerationAction(post, data, analysisResult);

            return hookData;

        } catch (error) {
            logger.error('[ai-moderation] Post edit moderation failed', {
                error: error.message,
                pid: post.pid,
                uid: post.uid
            });

            return hookData;
        }
    }
};

// モデレーション結果に基づくアクション処理
async function handleModerationAction(post, analysisResult) {
    const posts = require.main.require('./src/posts');
    const user = require.main.require('./src/user');
    const notifications = require.main.require('./src/notifications');

    switch (analysisResult.action) {
        case 'rejected':
            // 投稿を削除
            await posts.delete(post.pid, post.uid);
            
            // ユーザーに通知
            await notifications.create({
                type: 'ai-moderation-rejected',
                nid: `ai-moderation-rejected-${post.pid}`,
                from: 'system',
                to: post.uid,
                subject: '投稿が削除されました',
                bodyShort: 'AIモデレーションにより不適切と判定された投稿が削除されました。',
                path: `/post/${post.pid}`,
                importance: 5
            });

            logger.warn('[ai-moderation] Post rejected and deleted', {
                pid: post.pid,
                uid: post.uid,
                score: analysisResult.score,
                logId: analysisResult.logId
            });
            break;

        case 'flagged':
            // モデレーションキューに追加
            await addToModerationQueue(post, analysisResult);

            logger.info('[ai-moderation] Post flagged for review', {
                pid: post.pid,
                uid: post.uid,
                score: analysisResult.score,
                logId: analysisResult.logId
            });
            break;

        case 'approved':
            logger.info('[ai-moderation] Post approved', {
                pid: post.pid,
                uid: post.uid,
                score: analysisResult.score,
                logId: analysisResult.logId
            });
            break;

        default:
            logger.warn('[ai-moderation] Unknown action result', {
                action: analysisResult.action,
                pid: post.pid
            });
    }
}

// 編集時のモデレーション処理
async function handleEditModerationAction(post, editData, analysisResult) {
    if (analysisResult.action === 'rejected') {
        // 編集を拒否（元の内容を維持）
        editData.content = post.content;
        
        const notifications = require.main.require('./src/notifications');
        await notifications.create({
            type: 'ai-moderation-edit-rejected',
            nid: `ai-moderation-edit-rejected-${post.pid}`,
            from: 'system',
            to: post.uid,
            subject: '投稿の編集が拒否されました',
            bodyShort: 'AIモデレーションにより不適切と判定された編集が拒否されました。',
            path: `/post/${post.pid}`,
            importance: 5
        });

        logger.warn('[ai-moderation] Post edit rejected', {
            pid: post.pid,
            uid: post.uid,
            score: analysisResult.score
        });
    }
}

// モデレーションキューへの追加
async function addToModerationQueue(post, analysisResult) {
    const db = require.main.require('./src/database');
    
    const queueData = {
        pid: post.pid,
        uid: post.uid,
        cid: post.cid,
        content: post.content,
        score: analysisResult.score,
        categories: analysisResult.categories,
        logId: analysisResult.logId,
        createdAt: Date.now(),
        status: 'pending'
    };

    await db.setObject(`ai-moderation:queue:${post.pid}`, queueData);
    await db.sortedSetAdd('ai-moderation:queue:posts', Date.now(), post.pid);

    // カテゴリ別キューにも追加
    await db.sortedSetAdd(`ai-moderation:queue:cid:${post.cid}`, Date.now(), post.pid);
}

module.exports = postsHooks;