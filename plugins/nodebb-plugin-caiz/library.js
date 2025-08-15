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
const { IsFollowed } = require('./libs/community/core');

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

/**
 * フィルター: カテゴリーページでオーナー情報を追加
 */
plugin.filterCategoryBuild = async function (hookData) {
  const { templateData } = hookData;
  const { uid } = hookData.req;
  
  if (!uid || !templateData.cid || templateData.parentCid !== 0) {
    return hookData;
  }
  
  try {
    const data = require('./libs/community/data');
    const ownerGroup = await data.getObjectField(`category:${templateData.cid}`, 'ownerGroup');
    
    if (ownerGroup) {
      const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
      templateData.isOwner = isOwner;
      winston.info(`[plugin/caiz] Category ${templateData.cid} isOwner: ${isOwner} for user ${uid}`);
    }
  } catch (err) {
    winston.error(`[plugin/caiz] Error checking ownership for category ${templateData.cid}: ${err.message}`);
  }
  
  return hookData;
};

/**
 * フィルター: トピック作成制御
 */
plugin.filterTopicCreate = async function (hookData) {
  const { data } = hookData;
  const { uid, cid } = data;
  
  winston.info(`[plugin/caiz] Filtering topic creation for uid: ${uid}, cid: ${cid}`);
  
  if (!uid) {
    winston.info('[plugin/caiz] Anonymous user cannot create topics in communities');
    throw new Error('[[error:not-logged-in]]');
  }
  
  // Check if user is following the community
  const followResult = await IsFollowed({ uid }, { cid });
  if (!followResult.isFollowed) {
    winston.info(`[plugin/caiz] User ${uid} denied topic creation in category ${cid} - not following community`);
    throw new Error('[[caiz:error.members-only-posting]]');
  }
  
  return hookData;
};

/**
 * フィルター: 返信作成制御
 */
plugin.filterPostCreate = async function (hookData) {
  const { data } = hookData;
  const { uid, tid } = data;
  
  winston.info(`[plugin/caiz] Filtering post creation for uid: ${uid}, tid: ${tid}`);
  
  if (!uid) {
    winston.info('[plugin/caiz] Anonymous user cannot create posts in communities');
    throw new Error('[[error:not-logged-in]]');
  }
  
  // Get topic data to find category
  const Topics = require.main.require('./src/topics');
  const topic = await Topics.getTopicData(tid);
  
  if (!topic || !topic.cid) {
    winston.warn(`[plugin/caiz] Topic ${tid} not found or missing category`);
    return hookData;
  }
  
  // Check if user is following the community
  const followResult = await IsFollowed({ uid }, { cid: topic.cid });
  if (!followResult.isFollowed) {
    winston.info(`[plugin/caiz] User ${uid} denied post creation in topic ${tid} (category ${topic.cid}) - not following community`);
    throw new Error('[[caiz:error.members-only-posting]]');
  }
  
  return hookData;
};
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
sockets.caiz.deleteCommunity = Community.DeleteCommunity;
module.exports = plugin;
