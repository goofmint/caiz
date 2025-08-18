'use strict';
require('./libs/benchpress');
const winston = require.main.require('winston');
const sockets = require.main.require('./src/socket.io/plugins');
const privileges = require.main.require('./src/privileges');
const plugin = {};
const Base = require('./libs/base');
const Community = require('./libs/community');
const Category = require('./libs/category');
const Topic = require('./libs/topic');
const Header = require('./libs/header');
const { GetMemberRole } = require('./libs/community/core');

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
  
  // Admin routes for OAuth settings
  const routeHelpers = require.main.require('./src/routes/helpers');
  
  routeHelpers.setupAdminPageRoute(router, '/admin/plugins/caiz-oauth', [], (req, res) => {
    res.render('admin/plugins/caiz-oauth', {});
  });
  
  // OAuth callback routes
  router.post('/api/v3/plugins/caiz/oauth/discord/callback', (req, res) => {
    // Discord OAuth callback - return type 1 (pong) for verification
    res.status(200).json({ type: 1 });
  });
};

plugin.customizeCategoriesLink = Community.customizeIndexLink;
plugin.customizeCategoryLink = Category.customizeLink;
plugin.customizeTopicRender = Topic.customizeRender;
plugin.filterTopicsBuild = Community.filterTopicsBuild;
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
  
  // Check if user is a member of the community
  const memberResult = await GetMemberRole({ uid }, { cid });
  if (memberResult.role === 'guest' || memberResult.role === 'banned') {
    winston.info(`[plugin/caiz] User ${uid} denied topic creation in category ${cid} - role: ${memberResult.role}`);
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
  
  // Check if user is a member of the community
  const memberResult = await GetMemberRole({ uid }, { cid: topic.cid });
  if (memberResult.role === 'guest' || memberResult.role === 'banned') {
    winston.info(`[plugin/caiz] User ${uid} denied post creation in topic ${tid} (category ${topic.cid}) - role: ${memberResult.role}`);
    throw new Error('[[caiz:error.members-only-posting]]');
  }
  
  return hookData;
};

/**
 * Add admin navigation for OAuth settings
 */
plugin.addAdminNavigation = function (header, callback) {
  header.plugins.push({
    route: '/plugins/caiz-oauth',
    icon: 'fa-key',
    name: 'Caiz OAuth Settings'
  });
  
  callback(null, header);
};

sockets.caiz = {};
sockets.caiz.createCommunity = Community.Create;
sockets.caiz.followCommunity = Community.Follow;
sockets.caiz.unfollowCommunity = Community.Unfollow;
sockets.caiz.getMemberRole = Community.GetMemberRole;
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

// Admin socket handlers for OAuth settings
const oauthSettings = require('./libs/oauth-settings');
const adminSockets = require.main.require('./src/socket.io/admin');

adminSockets.plugins = adminSockets.plugins || {};
adminSockets.plugins.caiz = adminSockets.plugins.caiz || {};

adminSockets.plugins.caiz.getOAuthSettings = async function(socket) {
  // Check admin privileges
  const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
  if (!isAdmin) {
    throw new Error('[[error:no-privileges]]');
  }
  
  return await oauthSettings.getAllSettings();
};

adminSockets.plugins.caiz.saveOAuthSettings = async function(socket, data) {
  // Check admin privileges
  const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
  if (!isAdmin) {
    throw new Error('[[error:no-privileges]]');
  }
  
  if (!data || !data.platform || !data.settings) {
    throw new Error('Invalid parameters');
  }
  
  await oauthSettings.saveSettings(data.platform, data.settings);
  return { success: true };
};

adminSockets.plugins.caiz.testOAuthConnection = async function(socket, data) {
  // Check admin privileges
  const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
  if (!isAdmin) {
    throw new Error('[[error:no-privileges]]');
  }
  
  if (!data || !data.platform) {
    throw new Error('Invalid parameters');
  }
  
  return await oauthSettings.testConnection(data.platform);
};

module.exports = plugin;
