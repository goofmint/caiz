const winston = require.main.require('winston');
const Topics = require.main.require('./src/topics');
const Posts = require.main.require('./src/posts');
const User = require.main.require('./src/user');
const NotifierBase = require('./notifier-base');

/**
 * Discord notification handler
 * Sends notifications to Discord channels using bot API
 */
class DiscordNotifier extends NotifierBase {
    constructor() {
        super();
    }

    /**
     * Check Discord notification settings
     * @param {number} cid - Community ID
     * @param {string} notificationType - Type of notification (newTopic, newPost, memberJoin, memberLeave)
     * @returns {Object|null} Discord settings or null if not configured
     */
    async checkNotificationSettings(cid, notificationType) {
        try {
            const communityDiscordSettings = require('../community-discord-settings');
            const settings = await communityDiscordSettings.getSettings(cid);
            
            if (!settings || !settings.accessToken || !settings.webhook?.channelId) {
                winston.info(`[DiscordNotifier] No Discord connection for community ${cid}`);
                return null;
            }
            
            // Check if Discord notifications are enabled
            const notifications = settings.notifications || {};
            if (notifications.enabled === false) {
                winston.info(`[DiscordNotifier] Discord notifications disabled for community ${cid}`);
                return null;
            }
            
            // Check if notification type is enabled
            if (!notifications[notificationType]) {
                winston.info(`[DiscordNotifier] ${notificationType} notifications disabled for community ${cid}`);
                return null;
            }
            
            return settings;
        } catch (err) {
            winston.error(`[DiscordNotifier] Error checking notification settings: ${err.message}`);
            return null;
        }
    }

    /**
     * Send message to Discord using webhook
     * @param {Object} settings - Discord settings (accessToken, webhook)
     * @param {Object} message - Discord message with embeds
     */
    async sendMessage(settings, message) {
        try {
            // Use webhook instead of bot API
            const response = await fetch(`${settings.webhook.url}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Discord API error: ${response.status} - ${error}`);
            }
            
            winston.info('[DiscordNotifier] Message sent successfully to Discord');
            
            // Discord webhook returns 204 No Content on success, so no JSON to parse
            if (response.status === 204) {
                return { success: true };
            }
            
            // Try to parse JSON only if there's content
            const text = await response.text();
            return text ? JSON.parse(text) : { success: true };
            
        } catch (err) {
            winston.error(`[DiscordNotifier] Error sending Discord message: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send new topic notification to Discord
     * @param {Object} topicData - Topic data from NodeBB
     */
    async notifyNewTopic(topicData) {
        try {
            winston.info(`[DiscordNotifier] Processing new topic notification for topic ${topicData.tid} in category ${topicData.cid}`);
            
            // 1. Find root community
            const communityData = await this.findRootCommunity(topicData.cid);
            if (!communityData) {
                return;
            }
            
            // 2. Check Discord settings
            const settings = await this.checkNotificationSettings(communityData.cid, 'newTopic');
            if (!settings) {
                return;
            }
            
            // 3. Get topic details and user info
            const [topicDetails, userData, categoryData] = await Promise.all([
                Topics.getTopicData(topicData.tid),
                User.getUserData(topicData.uid),
                this.getCategoryData(topicData.cid)
            ]);
            
            if (!topicDetails || !userData) {
                winston.warn(`[DiscordNotifier] Missing topic or user data for topic ${topicData.tid}`);
                return;
            }
            
            // 4. Build Discord message
            const message = this.buildDiscordTopicMessage(topicDetails, userData, communityData, categoryData);
            
            // 5. Send to Discord
            await this.sendMessage(settings, message);
            winston.info(`[DiscordNotifier] Topic notification sent successfully for topic ${topicData.tid}`);
            
        } catch (err) {
            winston.error(`[DiscordNotifier] Error sending topic notification: ${err.message}`);
        }
    }

    /**
     * Build Discord Embed message for new topic
     * @param {Object} topicData - Topic data
     * @param {Object} userData - User data
     * @param {Object} communityData - Community data
     * @param {Object} categoryData - Category data
     * @returns {Object} Discord message with embeds
     */
    buildDiscordTopicMessage(topicData, userData, communityData, categoryData) {
        const topicUrl = `${this.baseUrl}/topic/${topicData.slug}`;
        const userAvatarUrl = userData.picture || `${this.baseUrl}/assets/uploads/system/avatar.png`;
        
        // Get content preview
        const contentPreview = this.formatContentPreview(topicData.content, 200);
        
        // Format timestamp
        const timestamp = new Date(topicData.timestamp).toISOString();
        
        return {
            embeds: [{
                title: topicData.title,
                description: contentPreview || 'No preview available',
                url: topicUrl,
                color: 3447003, // Blue color for new topics
                author: {
                    name: userData.displayname || userData.username,
                    icon_url: userAvatarUrl
                },
                fields: [
                    {
                        name: 'Community',
                        value: communityData.name,
                        inline: true
                    },
                    {
                        name: 'Category',
                        value: categoryData?.name || 'General',
                        inline: true
                    }
                ],
                footer: {
                    text: '📝 New Topic'
                },
                timestamp: timestamp
            }]
        };
    }

    /**
     * Send new comment notification to Discord
     * @param {Object} postData - Post data from NodeBB
     */
    async notifyNewComment(postData) {
        try {
            winston.info(`[DiscordNotifier] Processing new comment notification for post ${postData.pid}`);
            
            // Get topic information
            const topicData = await Topics.getTopicData(postData.tid);
            if (!topicData) {
                winston.warn(`[DiscordNotifier] Topic ${postData.tid} not found`);
                return;
            }
            
            // Find root community
            const communityData = await this.findRootCommunity(topicData.cid);
            if (!communityData) {
                return;
            }
            
            // Check Discord settings
            const settings = await this.checkNotificationSettings(communityData.cid, 'newPost');
            if (!settings) {
                return;
            }
            
            // Get user and comment details
            const [userData, commentData, categoryData] = await Promise.all([
                User.getUserData(postData.uid),
                Posts.getPostData(postData.pid),
                this.getCategoryData(topicData.cid)
            ]);
            
            if (!userData || !commentData) {
                winston.warn(`[DiscordNotifier] Missing data for comment ${postData.pid}`);
                return;
            }
            
            // Build and send Discord message
            const message = this.buildDiscordCommentMessage(commentData, topicData, userData, communityData, categoryData);
            await this.sendMessage(settings, message);
            winston.info(`[DiscordNotifier] Comment notification sent successfully for post ${postData.pid}`);
            
        } catch (err) {
            winston.error(`[DiscordNotifier] Error sending comment notification: ${err.message}`);
        }
    }

    /**
     * Build Discord Embed message for new comment
     * @param {Object} commentData - Comment data
     * @param {Object} topicData - Topic data
     * @param {Object} userData - User data
     * @param {Object} communityData - Community data
     * @param {Object} categoryData - Category data
     * @returns {Object} Discord message with embeds
     */
    buildDiscordCommentMessage(commentData, topicData, userData, communityData, categoryData) {
        const commentUrl = `${this.baseUrl}/topic/${topicData.slug}/${commentData.pid}#${commentData.pid}`;
        const userAvatarUrl = userData.picture || `${this.baseUrl}/assets/uploads/system/avatar.png`;
        
        // Get content preview
        const contentPreview = this.formatContentPreview(commentData.content, 200);
        
        // Format timestamp
        const timestamp = new Date(commentData.timestamp).toISOString();
        
        return {
            embeds: [{
                title: `Re: ${topicData.title}`,
                description: contentPreview || 'No preview available',
                url: commentUrl,
                color: 5763719, // Green color for comments
                author: {
                    name: userData.displayname || userData.username,
                    icon_url: userAvatarUrl
                },
                fields: [
                    {
                        name: 'Community',
                        value: communityData.name,
                        inline: true
                    },
                    {
                        name: 'Category',
                        value: categoryData?.name || 'General',
                        inline: true
                    }
                ],
                footer: {
                    text: '💬 New Comment'
                },
                timestamp: timestamp
            }]
        };
    }

    /**
     * Send member join notification to Discord
     * @param {Object} memberData - Member join data
     */
    async notifyMemberJoin(memberData) {
        try {
            winston.info(`[DiscordNotifier] Processing member join notification for uid ${memberData.uid}`);
            
            // Check if community is root
            const communityData = await this.findRootCommunity(memberData.cid);
            if (!communityData || communityData.cid !== memberData.cid) {
                winston.warn(`[DiscordNotifier] Category ${memberData.cid} is not a root community`);
                return;
            }
            
            // Check Discord settings
            const settings = await this.checkNotificationSettings(memberData.cid, 'memberJoin');
            if (!settings) {
                return;
            }
            
            // Get user info
            const userData = await User.getUserData(memberData.uid);
            if (!userData) {
                winston.warn(`[DiscordNotifier] User data not found for uid ${memberData.uid}`);
                return;
            }
            
            // Get member count
            const CommunityMembers = require('../community/members');
            let totalMembers = 0;
            try {
                const members = await CommunityMembers.getMembers(memberData.cid);
                totalMembers = members.length;
            } catch (err) {
                winston.warn(`[DiscordNotifier] Could not get member count`);
            }
            
            // Build and send Discord message
            const message = this.buildDiscordMemberJoinMessage(userData, communityData, totalMembers);
            await this.sendMessage(settings, message);
            winston.info(`[DiscordNotifier] Member join notification sent successfully`);
            
        } catch (err) {
            winston.error(`[DiscordNotifier] Error sending member join notification: ${err.message}`);
        }
    }

    /**
     * Build Discord Embed message for member join
     * @param {Object} userData - User data
     * @param {Object} communityData - Community data
     * @param {number} totalMembers - Total member count
     * @returns {Object} Discord message with embeds
     */
    buildDiscordMemberJoinMessage(userData, communityData, totalMembers) {
        const communityUrl = `${this.baseUrl}/${communityData.handle || communityData.slug}`;
        const userAvatarUrl = userData.picture || `${this.baseUrl}/assets/uploads/system/avatar.png`;
        const timestamp = new Date().toISOString();
        
        return {
            embeds: [{
                title: '🎉 New member joined!',
                description: `**${userData.displayname || userData.username}** has joined the community`,
                url: communityUrl,
                color: 15844367, // Gold color for member joins
                thumbnail: {
                    url: userAvatarUrl
                },
                fields: [
                    {
                        name: 'Community',
                        value: communityData.name,
                        inline: true
                    },
                    {
                        name: 'Total Members',
                        value: totalMembers.toString(),
                        inline: true
                    }
                ],
                footer: {
                    text: '👥 Member Joined'
                },
                timestamp: timestamp
            }]
        };
    }

    /**
     * Send member leave notification to Discord
     * @param {Object} leaveData - Member leave data
     */
    async notifyMemberLeave(leaveData) {
        try {
            winston.info(`[DiscordNotifier] Processing member leave notification for uid ${leaveData.uid}`);
            
            // Check if community is root
            const communityData = await this.findRootCommunity(leaveData.cid);
            if (!communityData || communityData.cid !== leaveData.cid) {
                winston.warn(`[DiscordNotifier] Category ${leaveData.cid} is not a root community`);
                return;
            }
            
            // Check Discord settings
            const settings = await this.checkNotificationSettings(leaveData.cid, 'memberLeave');
            if (!settings) {
                return;
            }
            
            // Get user info
            const userData = await User.getUserData(leaveData.uid);
            if (!userData) {
                winston.warn(`[DiscordNotifier] User data not found for uid ${leaveData.uid}`);
                return;
            }
            
            // Get remaining member count
            const CommunityMembers = require('../community/members');
            let remainingMembers = 0;
            try {
                const members = await CommunityMembers.getMembers(leaveData.cid);
                remainingMembers = members.length;
            } catch (err) {
                winston.warn(`[DiscordNotifier] Could not get member count`);
            }
            
            // Build and send Discord message
            const message = this.buildDiscordMemberLeaveMessage(userData, communityData, leaveData.reason, remainingMembers);
            await this.sendMessage(settings, message);
            winston.info(`[DiscordNotifier] Member leave notification sent successfully`);
            
        } catch (err) {
            winston.error(`[DiscordNotifier] Error sending member leave notification: ${err.message}`);
        }
    }

    /**
     * Build Discord Embed message for member leave
     * @param {Object} userData - User data
     * @param {Object} communityData - Community data
     * @param {string} reason - Leave reason (voluntary/removed)
     * @param {number} remainingMembers - Remaining member count
     * @returns {Object} Discord message with embeds
     */
    buildDiscordMemberLeaveMessage(userData, communityData, reason, remainingMembers) {
        const communityUrl = `${this.baseUrl}/${communityData.handle || communityData.slug}`;
        const userAvatarUrl = userData.picture || `${this.baseUrl}/assets/uploads/system/avatar.png`;
        const timestamp = new Date().toISOString();
        
        const isRemoved = reason === 'removed';
        const title = isRemoved ? '🚫 Member removed' : '👋 Member left';
        const description = isRemoved 
            ? `**${userData.displayname || userData.username}** was removed from the community`
            : `**${userData.displayname || userData.username}** has left the community`;
        const color = isRemoved ? 15158332 : 10070709; // Red for removed, gray for voluntary
        
        return {
            embeds: [{
                title: title,
                description: description,
                url: communityUrl,
                color: color,
                thumbnail: {
                    url: userAvatarUrl
                },
                fields: [
                    {
                        name: 'Community',
                        value: communityData.name,
                        inline: true
                    },
                    {
                        name: 'Remaining Members',
                        value: remainingMembers.toString(),
                        inline: true
                    }
                ],
                footer: {
                    text: '👥 Member Left'
                },
                timestamp: timestamp
            }]
        };
    }
}

module.exports = new DiscordNotifier();