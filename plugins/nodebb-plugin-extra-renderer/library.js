"use strict";

const meta = require.main.require('./src/meta');

const plugin = {};

plugin.init = async function(params) {
  const { router, middleware } = params;
  
  // Admin route
  const renderAdmin = (req, res) => {
    res.render('admin/plugins/extra-renderer', {});
  };
  
  router.get('/admin/plugins/extra-renderer', middleware.admin.buildHeader, renderAdmin);
  router.get('/api/admin/plugins/extra-renderer', renderAdmin);
};

plugin.addAdminNavigation = function(header, callback) {
  header.plugins.push({
    route: '/plugins/extra-renderer',
    icon: 'fa-code',
    name: 'Extra Renderer'
  });
  
  callback(null, header);
};

// Provide settings to client-side
plugin.appendConfig = async function(config) {
  const settings = await meta.settings.get('extra-renderer');
  config.extraRenderer = {
    krokiEndpoint: settings.krokiEndpoint || 'https://kroki.io/plantuml/svg'
  };
  return config;
};

module.exports = plugin;
