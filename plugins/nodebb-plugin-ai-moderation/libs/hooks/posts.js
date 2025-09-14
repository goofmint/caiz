'use strict';

const ContentAnalyzer = require('../core/analyzer');
const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const Posts = require.main.require('./src/posts');
const Flags = require.main.require('./src/flags');
const Groups = require.main.require('./src/groups');
const Users = require.main.require('./src/user');

const analyzer = new ContentAnalyzer();

// AI分析結果のキャッシュ（メモリ内、一時的）
const analysisCache = new Map();

// 編集時の重複排除・クールダウン用のメモリストア（最小実装）
const dedupeJobs = new Map(); // key -> expiryMs
const lastModerationByPost = new Map(); // pid -> timestamp
const lastModerationByUser = new Map(); // uid -> timestamp

function normalizeContent(input) {
    if (typeof input !== 'string') return '';
    let s = input;
    // remove code fences
    s = s.replace(/```[\s\S]*?```/g, '');
    // strip markdown headings, emphasis
    s = s.replace(/^#+\s*/gm, '').replace(/[\*_`~]/g, '');
    // strip html tags
    s = s.replace(/<[^>]+>/g, '');
    // normalize spaces
    s = s.replace(/\s+/g, ' ').trim().toLowerCase();
    // basic fullwidth to halfwidth (A-Z,0-9)
    s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
    return s;
}

function computeChangeMetrics(a, b) {
    const aa = normalizeContent(a);
    const bb = normalizeContent(b);
    const aLen = aa.length, bLen = bb.length;
    const maxLen = Math.max(aLen, bLen);
    let diff = 0;
    const minLen = Math.min(aLen, bLen);
    for (let i = 0; i < minLen; i++) {
        if (aa[i] !== bb[i]) diff++;
    }
    diff += Math.abs(aLen - bLen);
    const relative = maxLen ? diff / maxLen : 0;
    const absolute = diff;
    return { relative, absolute };
}

function hasSignificantChange(original, edited, threshold) {
    const { relative, absolute } = computeChangeMetrics(original, edited);
    return (relative >= threshold.relative) || (absolute >= threshold.absolute);
}

async function getEditSettingsStrict() {
    const s = await meta.settings.get('ai-moderation') || {};
    // 必須設定の厳格チェック（フォールバック禁止）
    if (!('edit.enabled' in s)) throw new Error('[ai-moderation] Missing setting: edit.enabled');
    if (!('edit.minChange.relative' in s) || !('edit.minChange.absolute' in s)) {
        throw new Error('[ai-moderation] Missing settings: edit.minChange.relative/absolute');
    }
    if (!('edit.cooldownSecs' in s)) throw new Error('[ai-moderation] Missing setting: edit.cooldownSecs');
    // 除外ロールは未設定でも空文字が許容される（キー自体が存在しない場合はエラー）
    if (!('edit.excludedRoles' in s)) throw new Error('[ai-moderation] Missing setting: edit.excludedRoles');

    const enabled = String(s['edit.enabled']) === 'true' || String(s['edit.enabled']) === '1';
    const threshold = {
        relative: Number(s['edit.minChange.relative']),
        absolute: Number(s['edit.minChange.absolute'])
    };
    const cooldownMs = Number(s['edit.cooldownSecs']) * 1000;
    if (Number.isNaN(threshold.relative) || Number.isNaN(threshold.absolute) || Number.isNaN(cooldownMs)) {
        throw new Error('[ai-moderation] Invalid numeric edit.* settings');
    }
    const excludedRoles = String(s['edit.excludedRoles'] || '').split(',').map(x => x.trim()).filter(Boolean);
    const flagUid = s.flagUid || 1;
    return { enabled, threshold, cooldownMs, excludedRoles, flagUid };
}

function acquireJobKey(key, ttlMs) {
    const now = Date.now();
    // prune
    for (const [k, exp] of dedupeJobs.entries()) { if (exp <= now) dedupeJobs.delete(k); }
    const expAt = dedupeJobs.get(key) || 0;
    if (expAt > now) return false;
    dedupeJobs.set(key, now + ttlMs);
    return true;
}

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
        try {
            const post = hookData.post;
            if (!post || !post.pid || typeof post.content !== 'string') {
                winston.warn('[ai-moderation] Invalid post payload on edit');
                return hookData;
            }

            // 設定読み込み（フォールバック禁止）
            const cfg = await getEditSettingsStrict();
            if (!cfg.enabled) {
                winston.info('[ai-moderation] Edit re-moderation disabled by settings');
                return hookData;
            }

            // 除外ロールチェック
            if (cfg.excludedRoles.length) {
                let groups = [];
                try {
                    const memberships = await Groups.getUserGroups([post.uid]);
                    if (Array.isArray(memberships) && memberships.length > 0) {
                        const userGroups = memberships[0];
                        if (Array.isArray(userGroups)) {
                            groups = userGroups
                                .filter(g => g && typeof g === 'object')
                                .map(g => g.displayName || g.name || '')
                                .filter(Boolean);
                        }
                    }
                } catch (e) {
                    winston.warn('[ai-moderation] getUserGroups failed; continuing with empty groups', { error: e.message, uid: post.uid });
                }
                if (groups.some(name => cfg.excludedRoles.includes(name))) {
                    winston.info('[ai-moderation] Bypassing remoderation due to excluded role', { uid: post.uid, groups });
                    return hookData;
                }
            }

            // クールダウン（ユーザー/投稿）
            const now = Date.now();
            const lastPid = lastModerationByPost.get(post.pid) || 0;
            const lastUid = lastModerationByUser.get(post.uid) || 0;
            if ((now - lastPid) < cfg.cooldownMs || (now - lastUid) < cfg.cooldownMs) {
                winston.info('[ai-moderation] Within cooldown window; skip remoderation', { pid: post.pid, uid: post.uid });
                return hookData;
            }

            // 重複排除（短TTL）
            const jobKey = `remod:post:${post.pid}`;
            if (!acquireJobKey(jobKey, Math.max(1000, Math.min(cfg.cooldownMs, 5000)))) {
                winston.info('[ai-moderation] Duplicate edit event suppressed', { jobKey });
                return hookData;
            }

            // 編集前の原文を取得して差分判定
            const [prev] = await Posts.getPostsFields([post.pid], ['content']);
            const previousRaw = prev && prev.content ? String(prev.content) : '';
            if (!hasSignificantChange(previousRaw, String(post.content), cfg.threshold)) {
                winston.info('[ai-moderation] Change below thresholds; skip remoderation', { pid: post.pid });
                return hookData;
            }

            // AI分析
            const analysisResult = await analyzer.analyzeContent({
                content: String(post.content),
                contentType: 'post',
                contentId: post.pid,
                uid: post.uid
            });

            winston.info('[ai-moderation] Post edit analysis result', { action: analysisResult.action, score: analysisResult.score });

            const actorUid = cfg.flagUid;

            if (analysisResult.action === 'flagged' || analysisResult.action === 'rejected') {
                // フラグを作成（待ち状態へ）
                await Flags.create('post', post.pid, actorUid, `AI Remoderation: score=${analysisResult.score}`, null, true);
                winston.info('[ai-moderation] Post flagged on edit', { pid: post.pid });
            } else {
                // 改善パス: 既存フラグがあれば解決
                await Flags.resolveFlag('post', post.pid, actorUid);
                winston.info('[ai-moderation] Resolved existing flags due to improvement', { pid: post.pid });
            }

            lastModerationByPost.set(post.pid, now);
            lastModerationByUser.set(post.uid, now);
        } catch (err) {
            winston.error('[ai-moderation] Error during post edit remoderation', { error: err.message, stack: err.stack });
        }
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
