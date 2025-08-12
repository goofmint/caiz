'use strict';

const ContentAnalyzer = require('../core/analyzer');
const winston = require.main.require('winston');

const analyzer = new ContentAnalyzer();

// AI分析結果のキャッシュ（メモリ内、一時的）
const analysisCache = new Map();

const postsHooks = {
    // 新規投稿作成時のフック
    async moderatePostCreate(hookData) {
        winston.info('[ai-moderation] Post create hook triggered', {
            content: hookData.post?.content?.substring(0, 50) || 'no content',
            pid: hookData.post?.pid,
            uid: hookData.post?.uid
        });
        
        // AI分析処理（全ての投稿を対象）
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

            // リジェクトの場合、投稿削除フラグを設定（保存前に拒否）
            if (analysisResult.action === 'rejected') {
                hookData.post.deleted = 1;
                winston.warn('[ai-moderation] Post rejected and marked as deleted');
            }
            
            // フラグ判定の場合、結果をキャッシュ（保存後フックで使用）
            if (analysisResult.action === 'flagged') {
                // 一時的なIDを生成（uidとコンテンツのハッシュなど）
                const tempKey = `${hookData.post?.uid}_${Date.now()}`;
                analysisCache.set(tempKey, {
                    score: analysisResult.score,
                    action: analysisResult.action,
                    content: content.substring(0, 100) // 照合用
                });
                
                // hookDataに一時キーを埋め込む
                hookData.post._aiModerationKey = tempKey;
                
                winston.info('[ai-moderation] Cached analysis result for post-save flagging', { 
                    tempKey,
                    score: analysisResult.score
                });
                
                // 古いキャッシュをクリーンアップ（5分以上前のものを削除）
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                for (const [key, value] of analysisCache.entries()) {
                    const timestamp = parseInt(key.split('_')[1], 10);
                    if (timestamp < fiveMinutesAgo) {
                        analysisCache.delete(key);
                    }
                }
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
    },

    // 投稿保存後のフック（フラグ作成用）
    async afterPostSave(data) {
        const { post } = data;
        
        // キャッシュキーが存在しない場合はスキップ
        if (!post._aiModerationKey) {
            return;
        }
        
        const cachedResult = analysisCache.get(post._aiModerationKey);
        if (!cachedResult) {
            winston.info('[ai-moderation] No cached analysis result found for post', { pid: post.pid });
            return;
        }
        
        // キャッシュを削除（使用済み）
        analysisCache.delete(post._aiModerationKey);
        
        winston.info('[ai-moderation] Processing cached flag result after save', {
            pid: post.pid,
            score: cachedResult.score
        });
        
        try {
            const flags = require.main.require('./src/flags');
            const posts = require.main.require('./src/posts');
            const topics = require.main.require('./src/topics');
            const settings = require('../core/settings');
            
            // 設定からflagUidを取得
            const config = await settings.getSettings();
            const flagUid = config.flagUid || 1;
            const pid = post.pid;
            
            // Step 1: pid → tid
            const [postData] = await posts.getPostsFields([pid], ['tid']);
            if (!postData?.tid) {
                winston.warn('[ai-moderation] No tid for pid in afterPostSave', { pid });
                return;
            }
            
            // Step 2: tid → cid
            const cid = await topics.getTopicField(postData.tid, 'cid');
            if (!cid) {
                winston.warn('[ai-moderation] No cid for tid in afterPostSave', { pid, tid: postData.tid });
                return;
            }
            
            // Step 3: NodeBBではフラグ作成に特別な権限は不要
            // デバッグ用にcidとuidを記録
            winston.info('[ai-moderation] Preparing to create flag', { 
                pid: pid,
                tid: postData.tid,
                cid: cid,
                uid: flagUid
            });
            
            // Step 4: Create flag (権限チェックなしで直接作成)
            // flags.create(type, id, uid, reason, timestamp, forceFlag)
            await flags.create(
                'post', 
                pid, 
                flagUid, 
                `AI Moderation: AI analysis flagged this content with score: ${cachedResult.score}`,
                null,  // timestamp (null = current time)
                true   // forceFlag to bypass rate limiting
            );
            
            winston.info('[ai-moderation] Post flagged successfully after save', { 
                pid: pid, 
                flagUid: flagUid,
                score: cachedResult.score
            });
            
        } catch (error) {
            winston.error('[ai-moderation] Failed to create flag after save', { 
                error: error.message,
                pid: post.pid
            });
        }
    }
};

module.exports = postsHooks;