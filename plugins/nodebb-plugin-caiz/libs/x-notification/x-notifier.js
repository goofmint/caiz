'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const xConfig = require('./x-config');
const xClient = require('./x-client');

const xNotifier = {};

xNotifier.notifyNewTopic = async (topicData) => {
  try {
    // Get community from category
    const community = await xConfig.getCommunityFromCategory(topicData.cid);
    if (!community) {
      winston.warn(`[x-notification] Could not find community for category ${topicData.cid}`);
      return;
    }
    
    // Get X notification config
    const config = await xConfig.getConfig(community.cid);
    winston.info(`[x-notification] Config for community ${community.cid}: enabled=${config.enabled}, newTopic=${config.events.newTopic}`);
    if (!config.enabled || !config.events.newTopic) {
      winston.info(`[x-notification] New topic notification disabled for community ${community.cid}`);
      return;
    }
    
    // Check if community is public
    if (community.disabled || community.hidden) {
      winston.info(`[x-notification] Skipping notification for non-public community ${community.cid}`);
      return;
    }
    
    // Get topic URL
    const baseUrl = nconf.get('url');
    const topicUrl = `${baseUrl}/topic/${topicData.tid}`;
    
    // Format message
    const message = `🆕 New topic in ${community.name}: ${topicData.title}\n${topicUrl}`;
    
    // Post to X
    await xClient.postToX(community.cid, message);
    winston.info(`[x-notification] New topic notification sent for topic ${topicData.tid}`);
    
  } catch (err) {
    winston.error(`[x-notification] Failed to send new topic notification: ${err.message}`);
  }
};

xNotifier.notifyNewPost = async (postData) => {
  try {
    // Get topic data
    const topics = require.main.require('./src/topics');
    const topicData = await topics.getTopicData(postData.tid);
    if (!topicData) {
      winston.warn(`[x-notification] Could not find topic ${postData.tid} for post ${postData.pid}`);
      return;
    }
    
    // Get community from category
    const community = await xConfig.getCommunityFromCategory(topicData.cid);
    if (!community) {
      winston.warn(`[x-notification] Could not find community for category ${topicData.cid}`);
      return;
    }
    
    // Get X notification config
    const config = await xConfig.getConfig(community.cid);
    if (!config.enabled || !config.events.newPost) {
      winston.info(`[x-notification] New post notification disabled for community ${community.cid}`);
      return;
    }
    
    // Check if community is public
    if (community.disabled || community.hidden) {
      winston.info(`[x-notification] Skipping notification for non-public community ${community.cid}`);
      return;
    }
    
    // Get post URL
    const baseUrl = nconf.get('url');
    const postUrl = `${baseUrl}/post/${postData.pid}`;
    
    // Format message
    const message = `💬 New post in ${community.name}: ${topicData.title}\n${postUrl}`;
    
    // Post to X
    await xClient.postToX(community.cid, message);
    winston.info(`[x-notification] New post notification sent for post ${postData.pid}`);
    
  } catch (err) {
    winston.error(`[x-notification] Failed to send new post notification: ${err.message}`);
  }
};

module.exports = xNotifier;