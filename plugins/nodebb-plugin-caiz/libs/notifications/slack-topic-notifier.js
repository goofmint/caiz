const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const https = require('https');
const querystring = require('querystring');

class SlackTopicNotifier {
    constructor() {
        this.baseUrl = nconf.get('url');
    }

    async notifyNewComment(postData) {
        try {
            winston.info(`[plugin/caiz] Processing new comment notification for post ${postData.pid} in topic ${postData.tid}`);

            // Get topic information
            const Topics = require.main.require('./src/topics');
            const Posts = require.main.require('./src/posts');
            const User = require.main.require('./src/user');
            
            const topicData = await Topics.getTopicData(postData.tid);
            if (!topicData) {
                winston.warn(`[plugin/caiz] Topic ${postData.tid} not found for comment ${postData.pid}`);
                return;
            }

            // Find the root community (parentCid === 0)
            const Categories = require.main.require('./src/categories');
            let categoryData = await Categories.getCategoryData(topicData.cid);
            let communityData = null;
            
            // Traverse up the category tree to find the root community
            while (categoryData) {
                if (categoryData.parentCid === 0) {
                    communityData = categoryData;
                    break;
                }
                categoryData = await Categories.getCategoryData(categoryData.parentCid);
            }
            
            if (!communityData) {
                winston.warn(`[plugin/caiz] No root community found for topic ${postData.tid}`);
                return;
            }

            // Use community ID for settings, not the direct category ID
            const communityCid = communityData.cid;
            // Get Slack connection settings using community ID
            const communitySlackSettings = require('../community-slack-settings');
            const slackSettings = await communitySlackSettings.getSettings(communityCid);
            
            if (!slackSettings || !slackSettings.accessToken || !slackSettings.webhookUrl) {
                winston.info(`[plugin/caiz] No Slack connection for community ${communityCid}, skipping comment notification`);
                return;
            }
            
            // Get notification settings using community ID
            const notificationSettings = await communitySlackSettings.getNotificationSettings(communityCid);
            if (!notificationSettings || notificationSettings.enabled === false || !notificationSettings.newPost) {
                winston.info(`[plugin/caiz] New post notifications disabled for community ${communityCid}, skipping`);
                return;
            }

            // Get user and comment details
            const userData = await User.getUserData(postData.uid);
            const commentData = await Posts.getPostData(postData.pid);
            
            if (!userData || !commentData) {
                winston.warn(`[plugin/caiz] Missing user or comment data for post ${postData.pid}`);
                return;
            }

            // Build and send Slack message
            const messagePayload = this.buildSlackCommentMessage(commentData, topicData, userData, communityData);
            await this.sendToSlack(slackSettings.webhookUrl, messagePayload);
            winston.info(`[plugin/caiz] Slack comment notification sent successfully for post ${postData.pid} to community ${communityCid}`);
        } catch (err) {
            winston.error(`[plugin/caiz] Error sending Slack comment notification for post ${postData.pid}: ${err.message}`);
        }
    }

    async notifyNewTopic(topicData) {
        try {
            winston.info(`[plugin/caiz] Processing new topic notification for topic ${topicData.tid} in category ${topicData.cid}`);

            // Find the root community (parentCid === 0)
            const Categories = require.main.require('./src/categories');
            let categoryData = await Categories.getCategoryData(topicData.cid);
            let communityData = null;
            
            // Traverse up the category tree to find the root community
            while (categoryData) {
                if (categoryData.parentCid === 0) {
                    communityData = categoryData;
                    break;
                }
                // Get parent category
                categoryData = await Categories.getCategoryData(categoryData.parentCid);
            }
            
            if (!communityData) {
                winston.info(`[plugin/caiz] Topic ${topicData.tid} is not in a community, skipping Slack notification`);
                return;
            }
            
            winston.info(`[plugin/caiz] Found community ${communityData.cid} (${communityData.name}) for topic ${topicData.tid}`);
            
            // Use community ID for settings, not the direct category ID
            const communityCid = communityData.cid;

            // Get Slack connection settings using community ID
            const communitySlackSettings = require('../community-slack-settings');
            const slackSettings = await communitySlackSettings.getSettings(communityCid);
            
            if (!slackSettings || !slackSettings.accessToken || !slackSettings.webhookUrl) {
                winston.info(`[plugin/caiz] No Slack connection for community ${communityCid}, skipping notification`);
                return;
            }

            // Get notification settings using community ID
            const notificationSettings = await communitySlackSettings.getNotificationSettings(communityCid);
            if (!notificationSettings || notificationSettings.enabled === false || !notificationSettings.newTopic) {
                winston.info(`[plugin/caiz] New topic notifications disabled for community ${communityCid}, skipping`);
                return;
            }

            // Get user and topic details
            const User = require.main.require('./src/user');
            const Topics = require.main.require('./src/topics');
            
            const [userData, topicDetails] = await Promise.all([
                User.getUserData(topicData.uid),
                Topics.getTopicData(topicData.tid)
            ]);

            if (!userData || !topicDetails) {
                winston.warn(`[plugin/caiz] Could not get user or topic data for topic ${topicData.tid}`);
                return;
            }

            // Build and send Slack message
            const messagePayload = this.buildSlackMessage(topicDetails, userData, communityData);
            await this.sendToSlack(slackSettings.webhookUrl, messagePayload);

            winston.info(`[plugin/caiz] Slack notification sent successfully for topic ${topicData.tid} to community ${communityCid}`);

        } catch (err) {
            winston.error(`[plugin/caiz] Error sending Slack notification for topic ${topicData.tid}: ${err.message}`);
        }
    }

    buildSlackMessage(topicData, userData, categoryData) {
        // Generate topic permalink
        const topicUrl = `${this.baseUrl}/topic/${topicData.slug}`;
        
        // Format creation date
        const createdDate = new Date(topicData.timestamp);
        const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) + ' at ' + createdDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Get content preview (first 100 characters)
        let contentPreview = '';
        if (topicData.content) {
            // Strip HTML tags and get plain text
            const plainText = topicData.content.replace(/<[^>]*>/g, '').trim();
            contentPreview = plainText.length > 100 
                ? plainText.substring(0, 100) + '...'
                : plainText;
        }

        const message = {
            text: `New Topic: ${topicData.title}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*New Topic Created*\n\n*Community:* ${categoryData.name}\n*Title:* ${topicData.title}\n*Author:* ${userData.username}\n*Created:* ${formattedDate}`
                    }
                }
            ]
        };

        // Add content preview if available
        if (contentPreview) {
            message.blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: contentPreview
                }
            });
        }

        // Add action button
        message.blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "View Topic"
                    },
                    url: topicUrl
                }
            ]
        });

        return message;
    }

    buildSlackCommentMessage(commentData, topicData, userData, categoryData) {
        // Generate comment permalink
        const commentUrl = `${this.baseUrl}/topic/${topicData.slug}/${commentData.pid}#${commentData.pid}`;
        
        // Format creation date
        const createdDate = new Date(commentData.timestamp);
        const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) + ' at ' + createdDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Get content preview (first 200 characters)
        let contentPreview = '';
        if (commentData.content) {
            // Strip HTML tags and get plain text
            const plainText = commentData.content.replace(/<[^>]*>/g, '').trim();
            contentPreview = plainText.length > 200 
                ? plainText.substring(0, 197) + '...'
                : plainText;
        }

        const message = {
            text: `New Comment: ${topicData.title}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*New Comment Posted*\n\n*Community:* ${categoryData.name}\n*Topic:* ${topicData.title}\n*Author:* ${userData.username}\n*Posted:* ${formattedDate}`
                    }
                }
            ]
        };

        // Add content preview if available
        if (contentPreview) {
            message.blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Comment:*\n${contentPreview}`
                }
            });
        }

        // Add action button
        message.blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "View Comment"
                    },
                    url: commentUrl
                }
            ]
        });

        return message;
    }

    async notifyMemberJoin(memberData) {
        try {
            winston.info(`[plugin/caiz] Processing member join notification for uid ${memberData.uid} in community ${memberData.cid}`);

            // 1. コミュニティ情報を取得（parentCid === 0を確認）
            const Categories = require.main.require('./src/categories');
            const categoryData = await Categories.getCategoryData(memberData.cid);
            
            // コミュニティが直接指定されているため、parentCid === 0のチェック
            if (!categoryData || categoryData.parentCid !== 0) {
                winston.warn(`[plugin/caiz] Category ${memberData.cid} is not a root community`);
                return;
            }
            
            const communityData = categoryData;

            // 2. Slack接続状況と通知設定を確認
            const communitySlackSettings = require('../community-slack-settings');
            const slackSettings = await communitySlackSettings.getSettings(memberData.cid);
            
            if (!slackSettings || !slackSettings.accessToken || !slackSettings.webhookUrl) {
                winston.info(`[plugin/caiz] No Slack connection for community ${memberData.cid}, skipping member join notification`);
                return;
            }
            
            // Get notification settings
            const notificationSettings = await communitySlackSettings.getNotificationSettings(memberData.cid);
            if (!notificationSettings || notificationSettings.enabled === false || !notificationSettings.memberJoin) {
                winston.info(`[plugin/caiz] Member join notifications disabled for community ${memberData.cid}, skipping`);
                return;
            }

            // 3. 参加したユーザー情報を取得
            const User = require.main.require('./src/user');
            const userData = await User.getUserData(memberData.uid);
            
            if (!userData) {
                winston.warn(`[plugin/caiz] User data not found for uid ${memberData.uid}`);
                return;
            }

            // 4. Slack Block Kitメッセージを構築
            const messagePayload = await this.buildSlackMemberJoinMessage(userData, communityData, memberData.role);
            
            // 5. Slack Webhook経由で通知送信
            await this.sendToSlack(slackSettings.webhookUrl, messagePayload);
            winston.info(`[plugin/caiz] Slack member join notification sent successfully for uid ${memberData.uid} to community ${memberData.cid}`);
        } catch (err) {
            winston.error(`[plugin/caiz] Error sending Slack member join notification: ${err.message}`);
        }
    }

    async buildSlackMemberJoinMessage(userData, communityData, role) {
        // Generate community URL
        const communityUrl = `${this.baseUrl}/${communityData.handle || communityData.slug}`;
        
        // Format join date
        const joinDate = new Date();
        const formattedDate = joinDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) + ' at ' + joinDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Get member count
        const CommunityMembers = require('../community/members');
        let totalMembers = 0;
        try {
            const members = await CommunityMembers.getMembers(communityData.cid);
            totalMembers = members.length;
        } catch (err) {
            winston.warn(`[plugin/caiz] Could not get member count for community ${communityData.cid}`);
        }

        const message = {
            text: `New member joined: ${userData.username}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🎉 *New member joined!*`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `👤 *${userData.username}* has joined the community\n\n📍 *${communityData.name}*${totalMembers > 0 ? `\n👥 Total members: ${totalMembers}` : ''}\n🕒 ${formattedDate}`
                    }
                }
            ]
        };

        // Add action button
        message.blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "👀 View Community"
                    },
                    url: communityUrl
                }
            ]
        });

        return message;
    }

    async notifyMemberLeave(leaveData) {
        try {
            winston.info(`[plugin/caiz] Processing member leave notification for uid ${leaveData.uid} in community ${leaveData.cid}`);

            // 1. コミュニティ情報を取得（parentCid === 0を確認）
            const Categories = require.main.require('./src/categories');
            const categoryData = await Categories.getCategoryData(leaveData.cid);
            
            // コミュニティが直接指定されているため、parentCid === 0のチェック
            if (!categoryData || categoryData.parentCid !== 0) {
                winston.warn(`[plugin/caiz] Category ${leaveData.cid} is not a root community`);
                return;
            }
            
            const communityData = categoryData;

            // 2. Slack接続状況と通知設定を確認
            const communitySlackSettings = require('../community-slack-settings');
            const slackSettings = await communitySlackSettings.getSettings(leaveData.cid);
            
            if (!slackSettings || !slackSettings.accessToken || !slackSettings.webhookUrl) {
                winston.info(`[plugin/caiz] No Slack connection for community ${leaveData.cid}, skipping member leave notification`);
                return;
            }
            
            // Get notification settings
            const notificationSettings = await communitySlackSettings.getNotificationSettings(leaveData.cid);
            if (!notificationSettings || notificationSettings.enabled === false || !notificationSettings.memberLeave) {
                winston.info(`[plugin/caiz] Member leave notifications disabled for community ${leaveData.cid}, skipping`);
                return;
            }

            // 3. 退出したユーザー情報を取得
            const User = require.main.require('./src/user');
            const userData = await User.getUserData(leaveData.uid);
            
            if (!userData) {
                winston.warn(`[plugin/caiz] User data not found for uid ${leaveData.uid}`);
                return;
            }

            // 4. 残りメンバー数を取得
            const CommunityMembers = require('../community/members');
            let remainingMembers = 0;
            try {
                const members = await CommunityMembers.getMembers(leaveData.cid);
                remainingMembers = members.length;
            } catch (err) {
                winston.warn(`[plugin/caiz] Could not get member count for community ${leaveData.cid}`);
            }

            // 5. Slack Block Kitメッセージを構築
            const messagePayload = this.buildSlackMemberLeaveMessage(userData, communityData, leaveData.reason, remainingMembers);
            
            // 6. Slack Webhook経由で通知送信
            await this.sendToSlack(slackSettings.webhookUrl, messagePayload);
            winston.info(`[plugin/caiz] Slack member leave notification sent successfully for uid ${leaveData.uid} from community ${leaveData.cid}`);
        } catch (err) {
            winston.error(`[plugin/caiz] Error sending Slack member leave notification: ${err.message}`);
        }
    }

    buildSlackMemberLeaveMessage(userData, communityData, reason, remainingMembers) {
        // Generate community URL
        const communityUrl = `${this.baseUrl}/${communityData.handle || communityData.slug}`;
        
        // Format leave date
        const leaveDate = new Date();
        const formattedDate = leaveDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) + ' at ' + leaveDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Determine message based on reason
        const isRemoved = reason === 'removed';
        const emoji = isRemoved ? '🚫' : '👋';
        const action = isRemoved ? 'removed' : 'left';
        const headerText = isRemoved ? 'Member removed' : 'Member left';
        const mainText = isRemoved 
            ? `👤 *${userData.username}* was removed from the community`
            : `👤 *${userData.username}* has left the community`;

        const message = {
            text: `Member ${action}: ${userData.username}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `${emoji} *${headerText}*`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `${mainText}\n\n📍 *${communityData.name}*${remainingMembers > 0 ? `\n👥 Remaining members: ${remainingMembers}` : ''}\n🕒 ${formattedDate}`
                    }
                }
            ]
        };

        return message;
    }

    async sendToSlack(webhookUrl, messagePayload) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(messagePayload);
            const url = new URL(webhookUrl);

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(body);
                    } else {
                        reject(new Error(`Slack webhook failed with status ${res.statusCode}: ${body}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();

            // 10 second timeout
            setTimeout(() => {
                req.destroy();
                reject(new Error('Slack webhook request timeout'));
            }, 10000);
        });
    }
}

module.exports = new SlackTopicNotifier();