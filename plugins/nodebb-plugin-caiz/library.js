'use strict';
require('./libs/benchpress');
const translator = require.main.require('./src/translator');
const winston = require.main.require('winston'); 
const plugin = {};
const Base = require('./libs/base');
const Community = require('./libs/community');
const Category = require('./libs/category');
const Topic = require('./libs/topic');
const Header = require('./libs/header');
const languages = require('./language.json');
plugin.init = async function (params) {
  const { router, middleware, controllers } = params;
  winston.info('[plugin/caiz] Initializing Caiz plugin');

  Object.keys(languages).forEach(lang => {
    Object.keys(languages[lang]).forEach(key => {
      translator.addTranslation(lang, key, languages[lang][key]);
    });
  });
  Base.router = router;
  Base.middleware = middleware;
  Base.controllers = controllers;

  // `/communities` を `/categories` の中身と同じように動かす
  router.get('/api/communities', controllers.categories.list);
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
  
  /*
  // APIエンドポイント（オプション）
  router.get('/api/:slug', async (req, res, next) => {
    try {
      const slug = req.params.slug;
      const allCategories = await categories.getAllCategories();
      const match = allCategories.find((c) => c && c.handle === slug);

      if (!match) return next();

      req.params.category_id = match.cid;
      req.params.slug = match.slug;
      res.json({category: match});
    } catch (err) {
      console.error('API error loading category by slug:', err);
      return next(err);
    }
  });
  */
};

plugin.customizeCategoriesLink = Community.customizeIndexLink;
plugin.customizeCategoryLink = Category.customizeLink;
plugin.customizeTopicRender = Topic.customizeRender;
plugin.customizeSidebarLeft = Header.customizeSidebarLeft;
module.exports = plugin;
