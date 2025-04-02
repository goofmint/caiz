const Categories = require.main.require('./src/categories');
const Topics = require.main.require('./src/topics');
const Base = require('./base');

const getTopic = async (params) => {
  const communityId = await Categories.getCidByHandle(params.handle);
  const category = await Categories.getCategoryData(params.cid.split('/')[0]);
  if (!category || !communityId || category.parentCid !== communityId) return null;
  return await Topics.getTopicData(params.topicId.split('-')[0]);
};

class Topic extends Base {

  static async Index(req, res, next) {
    try {
      const topic = await getTopic(req.params);
      if (!topic) return next();
      req.params.topic_id = topic.tid;
      req.params.slug = topic.slug.split('/')[1];
      Topic.controllers.topics.get(req, res, next);
    } catch (err) {
      console.error('Error loading category by slug:', err);
      return next(err);
    }
  }

  static async customizeRender(data) {
    const { templateData } = data;
    const { breadcrumbs } = templateData;
    console.log(breadcrumbs);
    const community = breadcrumbs.find(b => b.url.match(/.*\/category\/[0-9]\/([^\/]*)$/));
    const host = community.url.match(/(^.*\/\/.*?\/)/, "$1")[0]
    const handle = community.url.split('/')[5];
    breadcrumbs.forEach(breadcrumb => {
      if (!breadcrumb.url) return;
      if (breadcrumb.url.match(/\/categories$/)) {
        breadcrumb.url = `${host}communities`;
      }
      if (breadcrumb.text.startsWith('[[global:')) return;
      if (breadcrumb === community) {
        breadcrumb.url = `${host}${handle}`;
      } else {
        const categoryHandle = breadcrumb.url.split('/')[5];
        breadcrumb.url = `${host}${handle}/${breadcrumb.cid}-${categoryHandle}`;
      }
    });
    return data;
  }
}

module.exports = Topic;