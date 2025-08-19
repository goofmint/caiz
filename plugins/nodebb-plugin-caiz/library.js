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
    const nconf = require.main.require('nconf');
    const url = nconf.get('url');
    res.render('admin/plugins/caiz-oauth', {
      slackRedirectUrl: `${url}/api/v3/plugins/caiz/oauth/slack/callback`,
      discordRedirectUrl: `${url}/api/v3/plugins/caiz/oauth/discord/callback`
    });
  });
  
  // OAuth callback routes
  router.post('/api/v3/plugins/caiz/oauth/discord/callback', (req, res) => {
    // Discord OAuth callback - return type 1 (pong) for verification
    res.status(200).json({ type: 1 });
  });
  
  // Slack OAuth routes
  router.get('/api/v3/plugins/caiz/oauth/slack/auth', async (req, res) => {
    try {
      const { cid } = req.query;
      
      if (!cid) {
        return res.status(400).json({ error: 'Missing community ID' });
      }
      
      if (!req.uid) {
        return res.status(401).json({ error: 'Not logged in' });
      }
      
      // Check if user is community owner
      const isOwner = await Community.IsCommunityOwner({ uid: req.uid }, { cid });
      if (!isOwner.isOwner) {
        return res.status(403).json({ error: 'No privileges' });
      }
      
      const slackOAuth = require('./libs/slack-oauth');
      await slackOAuth.initialize();
      const state = slackOAuth.generateState(cid, req.uid);
      const authUrl = slackOAuth.generateAuthUrl(cid, state);
      
      res.redirect(authUrl);
    } catch (err) {
      winston.error(`[plugin/caiz] Slack OAuth auth error: ${err.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  router.get('/api/v3/plugins/caiz/oauth/slack/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      const nconf = require.main.require('nconf');
      const url = nconf.get('url');
      
      if (error) {
        winston.warn(`[plugin/caiz] Slack OAuth denied: ${error}`);
        return res.redirect(`${url}?slack_error=access_denied`);
      }
      
      if (!code || !state) {
        winston.warn('[plugin/caiz] Slack OAuth callback missing parameters');
        return res.redirect(`${url}?slack_error=invalid_request`);
      }
      
      const slackOAuth = require('./libs/slack-oauth');
      await slackOAuth.initialize();
      const result = await slackOAuth.handleCallback(code, state);
      
      if (result.success) {
        winston.info(`[plugin/caiz] Slack OAuth successful for community ${result.cid}`);
        
        // Get community handle for redirect
        const db = require.main.require('./src/database');
        const handle = await db.getObjectField(`category:${result.cid}`, 'handle');
        
        // Build redirect URL with success parameters
        const redirectUrl = `${url}/${handle}?slack_success=1&team=${encodeURIComponent(result.teamName)}${result.channelName ? `&channel=${encodeURIComponent(result.channelName)}` : ''}`;
        res.redirect(redirectUrl);
      } else {
        winston.warn('[plugin/caiz] Slack OAuth callback failed');
        res.redirect(`${url}?slack_error=auth_failed`);
      }
    } catch (err) {
      winston.error(`[plugin/caiz] Slack OAuth callback error: ${err.message}`);
      const nconf = require.main.require('nconf');
      const url = nconf.get('url');
      res.redirect(`${url}?slack_error=server_error`);
    }
  });
  
  router.get('/api/v3/plugins/caiz/oauth/discord/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      const nconf = require.main.require('nconf');
      const url = nconf.get('url');
      
      if (error) {
        winston.warn(`[plugin/caiz] Discord OAuth denied: ${error}`);
        return res.redirect(`${url}?discord_error=access_denied`);
      }
      
      if (!code || !state) {
        winston.warn('[plugin/caiz] Discord OAuth callback missing parameters');
        return res.redirect(`${url}?discord_error=invalid_request`);
      }
      
      const discordOAuth = require('./libs/discord-oauth');
      await discordOAuth.initialize();
      const result = await discordOAuth.handleCallback(code, state);
      
      if (result.success) {
        winston.info(`[plugin/caiz] Discord OAuth successful for community ${result.cid}`);
        
        // Get community handle for redirect
        const db = require.main.require('./src/database');
        const handle = await db.getObjectField(`category:${result.cid}`, 'handle');
        
        // Build redirect URL with success parameters
        const redirectUrl = `${url}/${handle}?discord_success=1&guild=${encodeURIComponent(result.guildName || '')}`;
        res.redirect(redirectUrl);
      } else {
        winston.warn('[plugin/caiz] Discord OAuth callback failed');
        res.redirect(`${url}?discord_error=auth_failed`);
      }
    } catch (err) {
      winston.error(`[plugin/caiz] Discord OAuth callback error: ${err.message}`);
      const nconf = require.main.require('nconf');
      const url = nconf.get('url');
      res.redirect(`${url}?discord_error=server_error`);
    }
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

// Slack OAuth socket handlers
const slackOAuth = require('./libs/slack-oauth');
const communitySlackSettings = require('./libs/community-slack-settings');

// Discord OAuth socket handlers
const discordOAuth = require('./libs/discord-oauth');
const communityDiscordSettings = require('./libs/community-discord-settings');

sockets.caiz.getSlackAuthUrl = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner
  const isOwner = await Community.IsCommunityOwner(socket, { cid: data.cid });
  if (!isOwner.isOwner) {
    throw new Error('[[error:no-privileges]]');
  }
  
  await slackOAuth.initialize();
  const state = slackOAuth.generateState(data.cid, socket.uid);
  const authUrl = slackOAuth.generateAuthUrl(data.cid, state);
  
  return {
    authUrl: authUrl,
    state: state
  };
};

sockets.caiz.getSlackConnectionStatus = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner
  const isOwner = await Community.IsCommunityOwner(socket, { cid: data.cid });
  if (!isOwner.isOwner) {
    throw new Error('[[error:no-privileges]]');
  }
  
  return await communitySlackSettings.getConnectionInfo(data.cid);
};

sockets.caiz.disconnectSlack = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner
  const isOwner = await Community.IsCommunityOwner(socket, { cid: data.cid });
  if (!isOwner.isOwner) {
    throw new Error('[[error:no-privileges]]');
  }
  
  await slackOAuth.initialize();
  return await slackOAuth.disconnect(data.cid);
};

sockets.caiz.getSlackChannels = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner
  const isOwner = await Community.IsCommunityOwner(socket, { cid: data.cid });
  if (!isOwner.isOwner) {
    throw new Error('[[error:no-privileges]]');
  }
  
  await slackOAuth.initialize();
  const channels = await slackOAuth.getChannels(data.cid);
  
  return {
    channels: channels
  };
};

sockets.caiz.setSlackChannel = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid || !data.channelId) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner
  const isOwner = await Community.IsCommunityOwner(socket, { cid: data.cid });
  if (!isOwner.isOwner) {
    throw new Error('[[error:no-privileges]]');
  }
  
  await communitySlackSettings.setNotificationChannel(data.cid, data.channelId, data.channelName || '');
  
  return { success: true };
};

// Discord OAuth socket handlers
sockets.caiz.getDiscordAuthUrl = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner or manager
  const memberRole = await Community.GetMemberRole(socket, { cid: data.cid });
  if (memberRole.role !== 'owner' && memberRole.role !== 'manager') {
    throw new Error('[[error:no-privileges]]');
  }
  
  await discordOAuth.initialize();
  const state = discordOAuth.generateState(data.cid, socket.uid);
  const authUrl = discordOAuth.generateAuthUrl(data.cid, state);
  
  return {
    authUrl: authUrl,
    state: state
  };
};

sockets.caiz.getDiscordStatus = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner or manager
  const memberRole = await Community.GetMemberRole(socket, { cid: data.cid });
  if (memberRole.role !== 'owner' && memberRole.role !== 'manager') {
    throw new Error('[[error:no-privileges]]');
  }
  
  const publicInfo = await communityDiscordSettings.getPublicInfo(data.cid);
  return publicInfo || { connected: false };
};

sockets.caiz.disconnectDiscord = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner or manager
  const memberRole = await Community.GetMemberRole(socket, { cid: data.cid });
  if (memberRole.role !== 'owner' && memberRole.role !== 'manager') {
    throw new Error('[[error:no-privileges]]');
  }
  
  await discordOAuth.initialize();
  return await discordOAuth.disconnect(data.cid);
};

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

// Slack notification settings socket handlers
sockets.caiz.getSlackNotificationSettings = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner or manager
  const memberRole = await Community.GetMemberRole(socket, { cid: data.cid });
  if (memberRole.role !== 'owner' && memberRole.role !== 'manager') {
    throw new Error('[[error:no-privileges]]');
  }
  
  const communitySlackSettings = require('./libs/community-slack-settings');
  return await communitySlackSettings.getNotificationSettings(data.cid);
};

sockets.caiz.saveSlackNotificationSettings = async function(socket, data) {
  if (!socket.uid) {
    throw new Error('[[error:not-logged-in]]');
  }
  
  if (!data || !data.cid || !data.settings) {
    throw new Error('Invalid parameters');
  }
  
  // Check if user is community owner or manager
  const memberRole = await Community.GetMemberRole(socket, { cid: data.cid });
  if (memberRole.role !== 'owner' && memberRole.role !== 'manager') {
    throw new Error('[[error:no-privileges]]');
  }
  
  const communitySlackSettings = require('./libs/community-slack-settings');
  return await communitySlackSettings.saveNotificationSettings(data.cid, data.settings);
};

// Topic creation notification hook
plugin.actionTopicSave = async function(hookData) {
  try {
    const topicData = hookData.topic;
    if (!topicData) {
      return;
    }

    winston.info(`[plugin/caiz] Topic saved: ${topicData.tid}, triggering notifications`);

    // Send Slack notification (non-blocking)
    setImmediate(async () => {
      try {
        const slackTopicNotifier = require('./libs/notifications/slack-topic-notifier');
        await slackTopicNotifier.notifyNewTopic(topicData);
      } catch (err) {
        winston.error(`[plugin/caiz] Error in Slack topic notification: ${err.message}`);
      }
    });

  } catch (err) {
    winston.error(`[plugin/caiz] Error in actionTopicSave hook: ${err.message}`);
  }
};

// Post (comment) creation notification hook  
plugin.actionPostSave = async function(hookData) {
  try {
    const post = hookData.post;
    
    // 新規投稿（コメント）かチェック
    if (!post || post.isMainPost) {
      return; // トピック作成は別の通知で処理
    }

    winston.info(`[plugin/caiz] Post saved: ${post.pid}, triggering comment notifications`);

    // Send Slack notification (non-blocking)
    setImmediate(async () => {
      try {
        const slackTopicNotifier = require('./libs/notifications/slack-topic-notifier');
        await slackTopicNotifier.notifyNewComment(post);
      } catch (err) {
        winston.error(`[plugin/caiz] Error in Slack comment notification: ${err.message}`);
      }
    });

  } catch (err) {
    winston.error(`[plugin/caiz] Error in actionPostSave hook: ${err.message}`);
  }
};

module.exports = plugin;
