'use strict';

const xConfig = require('./x-config');
const xClient = require('./x-client');
const nconf = require.main.require('nconf');
const categories = require.main.require('./src/categories');
const topics = require.main.require('./src/topics');
const user = require.main.require('./src/user');

const xNotification = {};

xNotification.handleEvent = async (eventType, data) => {
  try {
    // Extract community ID based on event type
    let cid;
    
    switch (eventType) {
      case 'newTopic':
        cid = data.topic ? data.topic.cid : data.cid;
        break;
      case 'newPost':
        if (data.post) {
          const topicData = await topics.getTopicData(data.post.tid);
          cid = topicData.cid;
        }
        break;
      case 'memberJoin':
      case 'memberLeave':
        // Extract community ID from group name (e.g., "cid:1:members")
        const match = data.groupName.match(/^cid:(\d+):members$/);
        if (match) {
          cid = match[1];
        }
        break;
    }
    
    if (!cid) {
      return;
    }
    
    // Get community (top-level category)
    const community = await xConfig.getCommunityFromCategory(cid);
    if (!community) {
      return;
    }
    
    // Get X notification config for this community
    const config = await xConfig.getConfig(community.cid);
    
    // Check if notifications are enabled for this event
    if (!config.enabled || !config.events || !config.events[eventType]) {
      return;
    }
    
    // Check if community/category is public
    const privileges = require.main.require('./src/privileges');
    const isPublic = await privileges.categories.can(['topics:read'], 0, cid); // Check guest access
    if (!isPublic || !isPublic[0]) {
      console.log('[x-notification] Skipping non-public content');
      return;
    }
    
    // Prepare message data
    const messageData = await xNotification.prepareMessageData(eventType, data, community);
    
    // Format message using template
    const template = config.templates[eventType];
    const message = xClient.formatMessage(template, messageData);
    
    // Post to X
    await xClient.postToX(community.cid, message);
    
    console.log(`[x-notification] Posted ${eventType} notification to X for community ${community.cid}`);
  } catch (err) {
    console.error(`[x-notification] Error handling ${eventType} event:`, err);
  }
};

xNotification.prepareMessageData = async (eventType, data, community) => {
  const baseUrl = nconf.get('url');
  const messageData = {
    community: community.name
  };
  
  switch (eventType) {
    case 'newTopic':
      messageData.title = data.topic.title;
      messageData.url = `${baseUrl}/topic/${data.topic.slug}`;
      messageData.username = data.topic.user ? data.topic.user.username : 'Anonymous';
      break;
      
    case 'newPost':
      const topicData = await topics.getTopicData(data.post.tid);
      messageData.title = topicData.title;
      messageData.url = `${baseUrl}/post/${data.post.pid}`;
      messageData.username = data.post.user ? data.post.user.username : 'Anonymous';
      break;
      
    case 'memberJoin':
    case 'memberLeave':
      const userData = await user.getUserData(data.uid);
      messageData.username = userData.username;
      messageData.url = `${baseUrl}/category/${community.slug}`;
      break;
  }
  
  return messageData;
};

module.exports = xNotification;