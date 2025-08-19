const axios = require('axios');
const Categories = require.main.require('./src/categories');
const Topics = require.main.require('./src/topics');
const Posts = require.main.require('./src/posts');
const User = require.main.require('./src/user');
const Utils = require.main.require('./src/utils');
const CommunitySlackSettings = require('../community-slack-settings');

class SlackCommentNotifier {
    /**
     * 新規コメント通知を送信
     * @param {Object} postData - 投稿データ
     */
    async sendNewCommentNotification(postData) {
        try {
            console.log('[SlackCommentNotifier] Processing new comment notification for post:', postData.pid);
            
            // 1. トピック情報を取得
            const topicData = await Topics.getTopicData(postData.tid);
            if (!topicData) {
                console.log('[SlackCommentNotifier] Topic not found:', postData.tid);
                return;
            }
            
            // 2. カテゴリ階層を辿ってコミュニティを特定
            let categoryData = await Categories.getCategoryData(topicData.cid);
            let communityData = null;
            const topicCategoryData = categoryData; // トピックの直接カテゴリを保存
            
            // Traverse up the category tree to find the root community
            while (categoryData) {
                if (categoryData.parentCid === 0) {
                    communityData = categoryData;
                    break;
                }
                categoryData = await Categories.getCategoryData(categoryData.parentCid);
            }
            
            if (!communityData) {
                console.log('[SlackCommentNotifier] No community found for category:', topicData.cid);
                return;
            }
            
            console.log('[SlackCommentNotifier] Found community:', communityData.name, 'cid:', communityData.cid);
            
            // 3. Slack接続状況と通知設定を確認
            const slackSettings = await CommunitySlackSettings.getSettings(communityData.cid);
            if (!slackSettings || !slackSettings.botToken || !slackSettings.channelId) {
                console.log('[SlackCommentNotifier] Slack not configured for community:', communityData.cid);
                return;
            }
            
            // 通知設定をチェック（新規投稿が有効かどうか）
            if (!slackSettings.notifications || !slackSettings.notifications.newPost) {
                console.log('[SlackCommentNotifier] New post notifications disabled for community:', communityData.cid);
                return;
            }
            
            // 4. 投稿者情報を取得
            const userData = await User.getUserData(postData.uid);
            if (!userData) {
                console.log('[SlackCommentNotifier] User not found:', postData.uid);
                return;
            }
            
            // 5. コメントデータを取得
            const commentData = await Posts.getPostData(postData.pid);
            if (!commentData) {
                console.log('[SlackCommentNotifier] Comment not found:', postData.pid);
                return;
            }
            
            // 6. Slack Block Kitメッセージを構築
            const message = this.buildCommentMessage(commentData, topicData, userData, communityData, topicCategoryData);
            
            // 7. Slack API経由で通知送信
            await this.sendSlackMessage(slackSettings.botToken, slackSettings.channelId, message);
            
            console.log('[SlackCommentNotifier] Comment notification sent successfully for post:', postData.pid);
            
        } catch (error) {
            console.error('[SlackCommentNotifier] Error sending comment notification:', error);
        }
    }
    
    /**
     * コメント通知用のSlack Block Kitメッセージを構築
     * @param {Object} commentData - コメントデータ
     * @param {Object} topicData - トピックデータ
     * @param {Object} userData - 投稿者データ
     * @param {Object} communityData - コミュニティデータ
     * @param {Object} topicCategoryData - トピックの直接カテゴリデータ
     * @returns {Object} Slack Block Kit形式のメッセージ
     */
    buildCommentMessage(commentData, topicData, userData, communityData, topicCategoryData) {
        const baseUrl = require('nconf').get('url');
        const topicUrl = `${baseUrl}/topic/${topicData.slug}/${commentData.pid}#${commentData.pid}`;
        const userAvatarUrl = userData.picture || `${baseUrl}/assets/uploads/system/avatar.png`;
        
        // コメント内容をフォーマット
        const formattedContent = this.formatCommentContent(commentData.content);
        
        // 日時をフォーマット
        const commentDate = new Date(commentData.timestamp);
        const formattedDate = commentDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        return {
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🗨️ New comment posted"
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `👤 *${userData.displayname || userData.username}* commented on:`
                    },
                    accessory: {
                        type: "image",
                        image_url: userAvatarUrl,
                        alt_text: userData.displayname || userData.username
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `📝 *"${topicData.title}"*`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `💬 "${formattedContent}"`
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `📍 #${topicCategoryData?.name || 'general'} | ${communityData.name}`
                        }
                    ]
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `🕒 ${formattedDate}`
                        }
                    ]
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "👀 View Topic"
                            },
                            url: topicUrl,
                            style: "primary"
                        }
                    ]
                }
            ]
        };
    }
    
    /**
     * コメント内容をSlack表示用にフォーマット
     * @param {string} content - HTML形式のコメント内容
     * @returns {string} プレーンテキスト（200文字以内）
     */
    formatCommentContent(content) {
        if (!content) return '';
        
        // HTMLタグを除去
        let plainText = content.replace(/<[^>]*>/g, '');
        
        // HTMLエンティティをデコード
        plainText = Utils.decodeHTMLEntities(plainText);
        
        // 改行を空白に変換
        plainText = plainText.replace(/\n+/g, ' ');
        
        // 複数の空白を単一空白に変換
        plainText = plainText.replace(/\s+/g, ' ');
        
        // 前後の空白を削除
        plainText = plainText.trim();
        
        // 200文字でカット
        if (plainText.length > 200) {
            plainText = plainText.substring(0, 197) + '...';
        }
        
        return plainText;
    }
    
    /**
     * Slack APIにメッセージを送信
     * @param {string} botToken - Slack Bot Token
     * @param {string} channelId - 送信先チャンネルID
     * @param {Object} message - Block Kit形式のメッセージ
     */
    async sendSlackMessage(botToken, channelId, message) {
        try {
            const response = await axios.post('https://slack.com/api/chat.postMessage', {
                channel: channelId,
                ...message
            }, {
                headers: {
                    'Authorization': `Bearer ${botToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.data.ok) {
                throw new Error(`Slack API error: ${response.data.error}`);
            }
            
            console.log('[SlackCommentNotifier] Message sent successfully to Slack');
            
        } catch (error) {
            console.error('[SlackCommentNotifier] Error sending Slack message:', error);
            throw error;
        }
    }
}

module.exports = SlackCommentNotifier;