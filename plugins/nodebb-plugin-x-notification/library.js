'use strict';

const controllers = require('./lib/controllers');
const xAuth = require('./lib/x-auth');
const xNotification = require('./lib/x-notification');
const settings = require('./lib/settings');

const plugin = {};

plugin.init = async (params) => {
  const { router, middleware } = params;
  const { app } = params;
  
  // Admin routes
  router.get('/admin/plugins/x-notification', middleware.admin.buildHeader, controllers.renderAdminPage);
  router.get('/api/admin/plugins/x-notification', controllers.renderAdminPage);
  
  // OAuth callback route
  router.get('/x-notification/callback', controllers.handleOAuthCallback);
  router.get('/api/x-notification/callback', controllers.handleOAuthCallback);
  
  // Community X settings API
  router.get('/api/community/:cid/x-settings', middleware.ensureLoggedIn, controllers.getXSettings);
  router.post('/api/community/:cid/x-settings', middleware.ensureLoggedIn, controllers.saveXSettings);
  router.post('/api/community/:cid/x-connect', middleware.ensureLoggedIn, controllers.startXConnect);
  router.delete('/api/community/:cid/x-account/:accountId', middleware.ensureLoggedIn, controllers.deleteXAccount);
  router.post('/api/community/:cid/x-test', middleware.ensureLoggedIn, controllers.sendTestPost);
  
  await settings.init();
};

plugin.addAdminNavigation = (header, callback) => {
  header.plugins.push({
    route: '/plugins/x-notification',
    icon: 'fa-twitter',
    name: 'X Notification'
  });
  
  callback(null, header);
};

// Event handlers
plugin.handleTopicCreate = async (data) => {
  await xNotification.handleEvent('newTopic', data);
};

plugin.handlePostCreate = async (data) => {
  const { post } = data;
  // Skip if this is the main post (already handled by topic.save)
  if (post && post.isMain) {
    return;
  }
  await xNotification.handleEvent('newPost', data);
};

plugin.handleMemberJoin = async (data) => {
  await xNotification.handleEvent('memberJoin', data);
};

plugin.handleMemberLeave = async (data) => {
  await xNotification.handleEvent('memberLeave', data);
};

module.exports = plugin;