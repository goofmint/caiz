'use strict';
require('./libs/benchpress');
const winston = require.main.require('winston');
const sockets = require.main.require('./src/socket.io/plugins');
const plugin = {};
const Base = require('./libs/base');
const Community = require('./libs/community');
const Category = require('./libs/category');
const Topic = require('./libs/topic');
const Header = require('./libs/header');
const ModerationService = require('./libs/moderation/service');
const ModerationQueue = require('./libs/moderation/queue');
const ModerationSettings = require('./libs/moderation/settings');

plugin.init = async function (params) {
  const { router, middleware, controllers } = params;
  winston.info('[plugin/caiz] Initializing Caiz plugin');
  Base.router = router;
  Base.middleware = middleware;
  Base.controllers = controllers;
  // `/communities` を `/categories` の中身と同じように動かす
  router.get('/api/communities', controllers.categories.list);
  router.get('/api/communities/user', middleware.authenticateRequest, Community.User);
  router.get('/api/:handle', Community.Index);
  router.get('/api/:handle/:cid-:slug', Category.Index);
  router.get('/api/:handle/:cid-:slug/:topicId-:topicSlug', Topic.Index);
  router.get('/communities', middleware.buildHeader, controllers.categories.list);
  // router.get('/api/communities', controllers.categories.list);
  // Community URL
  router.get('/:handle', middleware.buildHeader, Community.Index);
  router.get('/:handle/:cid-:slug', middleware.buildHeader, Category.Index);
  // e.g /javascript/7-general-discussion-fea61ee9
  router.get('/:handle/:cid-:slug/:topicId-:topicSlug', middleware.buildHeader, Topic.Index);
};

plugin.customizeCategoriesLink = Community.customizeIndexLink;
plugin.customizeCategoryLink = Category.customizeLink;
plugin.customizeTopicRender = Topic.customizeRender;
plugin.customizeSidebarCommunities = Header.customizeSidebarCommunities;
plugin.loadCommunityEditModal = Header.loadCommunityEditModal;
sockets.caiz = {};
sockets.caiz.createCommunity = Community.Create;
sockets.caiz.followCommunity = Community.Follow;
sockets.caiz.unfollowCommunity = Community.Unfollow;
sockets.caiz.isFollowed = Community.IsFollowed;
sockets.caiz.getCommunities = Community.User;
sockets.caiz.isCommunityOwner = Community.IsCommunityOwner;
sockets.caiz.getCommunityData = Community.GetCommunityData;
sockets.caiz.updateCommunityData = Community.UpdateCommunityData;
sockets.caiz.getSubCategories = Community.GetSubCategories;
sockets.caiz.createSubCategory = Community.CreateSubCategory;
sockets.caiz.updateSubCategory = Community.UpdateSubCategory;
sockets.caiz.deleteSubCategory = Community.DeleteSubCategory;
sockets.caiz.reorderSubCategories = Community.ReorderSubCategories;
sockets.caiz.getMembers = Community.GetMembers;
sockets.caiz.addMember = Community.AddMember;
sockets.caiz.changeMemberRole = Community.ChangeMemberRole;
sockets.caiz.removeMember = Community.RemoveMember;

// Moderation WebSocket API
sockets.caiz.getPendingPosts = async function(socket, data) {
  winston.info(`[moderation] Getting pending posts for cid ${data.cid}`);
  
  try {
    if (!data.cid) {
      throw new Error('Community ID is required');
    }
    
    const page = data.page || 1;
    const limit = data.limit || 20;
    
    const pendingPosts = await moderationQueue.getPendingPosts(data.cid, page, limit);
    const pendingCount = await moderationQueue.getPendingCount(data.cid);
    
    return {
      posts: pendingPosts,
      totalCount: pendingCount,
      page: page,
      limit: limit
    };
  } catch (error) {
    winston.error(`[moderation] Error getting pending posts:`, error);
    throw error;
  }
};

sockets.caiz.reviewPost = async function(socket, data) {
  winston.info(`[moderation] Reviewing post ${data.pid}: ${data.action}`);
  
  try {
    if (!data.pid || !data.action || !['approve', 'reject'].includes(data.action)) {
      throw new Error('Valid post ID and action (approve/reject) are required');
    }
    
    const reviewerUid = socket.uid;
    const result = await moderationQueue.reviewPost(data.pid, data.action, reviewerUid, data.reason);
    
    return {
      success: true,
      action: data.action,
      pid: data.pid,
      reviewedAt: result.reviewed_at
    };
  } catch (error) {
    winston.error(`[moderation] Error reviewing post:`, error);
    throw error;
  }
};

sockets.caiz.getModerationSettings = async function(socket, data) {
  winston.info(`[moderation] Getting settings for cid ${data.cid}`);
  
  try {
    if (!data.cid) {
      throw new Error('Community ID is required');
    }
    
    const settings = await moderationSettings.getSettings(data.cid);
    return settings;
  } catch (error) {
    winston.error(`[moderation] Error getting moderation settings:`, error);
    throw error;
  }
};

sockets.caiz.updateModerationSettings = async function(socket, data) {
  winston.info(`[moderation] Updating settings for cid ${data.cid}`);
  
  try {
    if (!data.cid) {
      throw new Error('Community ID is required');
    }
    
    const updatedSettings = await moderationSettings.updateSettings(data.cid, data.settings);
    return updatedSettings;
  } catch (error) {
    winston.error(`[moderation] Error updating moderation settings:`, error);
    throw error;
  }
};

sockets.caiz.getModerationStats = async function(socket, data) {
  winston.info(`[moderation] Getting stats for cid ${data.cid}`);
  
  try {
    if (!data.cid) {
      throw new Error('Community ID is required');
    }
    
    const days = data.days || 7;
    const stats = await moderationQueue.getQueueStats(data.cid, days);
    return stats;
  } catch (error) {
    winston.error(`[moderation] Error getting moderation stats:`, error);
    throw error;
  }
};

// Moderation services
const moderationService = new ModerationService();
const moderationQueue = new ModerationQueue();
const moderationSettings = new ModerationSettings();

// AI Moderation hooks
plugin.moderateNewTopic = async function(data) {
  winston.info(`[moderation] Checking new topic: ${data.title}`);
  
  try {
    const settings = await moderationSettings.getSettings(data.cid);
    
    if (!settings.enabled) {
      return data;
    }

    // Combine title and content for analysis
    const contentToAnalyze = `${data.title}\n\n${data.content}`;
    const moderationResult = await moderationService.analyzeContent(contentToAnalyze);
    
    // Store result for post-creation processing
    data._moderationResult = moderationResult;
    
    const thresholds = await moderationSettings.getThresholds(data.cid);
    
    if (moderationResult.normalizedScore >= thresholds.reject) {
      winston.warn(`[moderation] Topic rejected with score ${moderationResult.normalizedScore}`);
      throw new Error('この投稿は不適切な内容が含まれているため投稿できません。');
    } else if (moderationResult.normalizedScore >= thresholds.moderate) {
      winston.info(`[moderation] Topic flagged for moderation with score ${moderationResult.normalizedScore}`);
      data._requiresModeration = true;
    }
    
    return data;
  } catch (error) {
    winston.error(`[moderation] Error in topic moderation:`, error);
    if (error.message.includes('投稿できません')) {
      throw error; // Re-throw user-facing errors
    }
    return data; // Continue with posting if moderation fails
  }
};

plugin.moderateNewPost = async function(data) {
  winston.info(`[moderation] Checking new post in topic ${data.tid}`);
  
  try {
    const settings = await moderationSettings.getSettings(data.cid);
    
    if (!settings.enabled) {
      return data;
    }

    const moderationResult = await moderationService.analyzeContent(data.content);
    
    const thresholds = await moderationSettings.getThresholds(data.cid);
    
    if (moderationResult.normalizedScore >= thresholds.reject) {
      winston.warn(`[moderation] Post rejected with score ${moderationResult.normalizedScore}`);
      throw new Error('この投稿は不適切な内容が含まれているため投稿できません。');
    } else if (moderationResult.normalizedScore >= thresholds.moderate) {
      winston.info(`[moderation] Post flagged for moderation with score ${moderationResult.normalizedScore}`);
      
      // Add to moderation queue after post is created
      setTimeout(async () => {
        try {
          await moderationQueue.addToQueue({
            pid: data.pid,
            cid: data.cid,
            uid: data.uid,
            content: data.content
          }, moderationResult, thresholds.moderate);
        } catch (queueError) {
          winston.error(`[moderation] Failed to add post to queue:`, queueError);
        }
      }, 100);
    }
    
    return data;
  } catch (error) {
    winston.error(`[moderation] Error in post moderation:`, error);
    if (error.message.includes('投稿できません')) {
      throw error; // Re-throw user-facing errors
    }
    return data; // Continue with posting if moderation fails
  }
};

plugin.moderateEditedPost = async function(data) {
  winston.info(`[moderation] Checking edited post ${data.pid}`);
  
  try {
    const settings = await moderationSettings.getSettings(data.cid);
    
    if (!settings.enabled) {
      return data;
    }

    const moderationResult = await moderationService.analyzeContent(data.content);
    
    const thresholds = await moderationSettings.getThresholds(data.cid);
    
    if (moderationResult.normalizedScore >= thresholds.reject) {
      winston.warn(`[moderation] Post edit rejected with score ${moderationResult.normalizedScore}`);
      throw new Error('この編集内容は不適切な内容が含まれているため保存できません。');
    } else if (moderationResult.normalizedScore >= thresholds.moderate) {
      winston.info(`[moderation] Post edit flagged for moderation with score ${moderationResult.normalizedScore}`);
      
      // Add to moderation queue
      setTimeout(async () => {
        try {
          await moderationQueue.addToQueue({
            pid: data.pid,
            cid: data.cid,
            uid: data.uid,
            content: data.content
          }, moderationResult, thresholds.moderate);
        } catch (queueError) {
          winston.error(`[moderation] Failed to add edited post to queue:`, queueError);
        }
      }, 100);
    }
    
    return data;
  } catch (error) {
    winston.error(`[moderation] Error in post edit moderation:`, error);
    if (error.message.includes('保存できません')) {
      throw error; // Re-throw user-facing errors
    }
    return data; // Continue with edit if moderation fails
  }
};

module.exports = plugin;
