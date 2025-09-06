'use strict';

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const xConfig = require('./x-config');
const xClient = require('./x-client');

const xNotifier = {};

// HTML entity decoder (same as notifier-base.js)
xNotifier.decodeHtmlEntities = (text) => {
  if (!text) return text;
  
  // Common HTML entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#039;': "'",
    '&nbsp;': ' ',
    '&#x2F;': '/',
    '&#x2f;': '/',
    '&#47;': '/'
  };
  
  let decoded = text;
  for (const [entity, replacement] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
  }
  
  // Handle numeric entities like &#123;
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Handle hex entities like &#x1F;
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
};

xNotifier.notifyNewTopic = async (topicData) => {
  try {
    // Get community from category
    const community = await xConfig.getCommunityFromCategory(topicData.cid);
    if (!community) {
      winston.warn(`[x-notification] Could not find community for category ${topicData.cid}`);
      return;
    }
    
    // Get X connection config (for enabled status)
    const xConnConfig = await xConfig.getConfig(community.cid);
    if (!xConnConfig.enabled) {
      winston.info(`[x-notification] X notifications disabled for community ${community.cid}`);
      return;
    }
    
    // Get common notification settings (same as Slack/Discord)
    const communitySlackSettings = require('../community-slack-settings');
    const notificationSettings = await communitySlackSettings.getNotificationSettings(community.cid);
    if (!notificationSettings || notificationSettings.enabled === false || !notificationSettings.newTopic) {
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
    
    // Format message with HTML entity decoding
    const decodedCommunityName = xNotifier.decodeHtmlEntities(community.name);
    const decodedTitle = xNotifier.decodeHtmlEntities(topicData.title);
    const message = `🆕 New topic in ${decodedCommunityName}: ${decodedTitle}\n${topicUrl}`;
    
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
    
    // Get X connection config (for enabled status)
    const xConnConfig = await xConfig.getConfig(community.cid);
    if (!xConnConfig.enabled) {
      winston.info(`[x-notification] X notifications disabled for community ${community.cid}`);
      return;
    }
    
    // Get common notification settings (same as Slack/Discord)
    const communitySlackSettings = require('../community-slack-settings');
    const notificationSettings = await communitySlackSettings.getNotificationSettings(community.cid);
    if (!notificationSettings || notificationSettings.enabled === false || !notificationSettings.newPost) {
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
    
    // Format message with HTML entity decoding
    const decodedCommunityName = xNotifier.decodeHtmlEntities(community.name);
    const decodedTitle = xNotifier.decodeHtmlEntities(topicData.title);
    const message = `💬 New post in ${decodedCommunityName}: ${decodedTitle}\n${postUrl}`;
    
    // Post to X
    await xClient.postToX(community.cid, message);
    winston.info(`[x-notification] New post notification sent for post ${postData.pid}`);
    
  } catch (err) {
    winston.error(`[x-notification] Failed to send new post notification: ${err.message}`);
  }
};

module.exports = xNotifier;