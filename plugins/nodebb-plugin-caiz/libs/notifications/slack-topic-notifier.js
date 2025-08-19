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
            if (!notificationSettings || !notificationSettings.newPost) {
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
            if (!notificationSettings || !notificationSettings.newTopic) {
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