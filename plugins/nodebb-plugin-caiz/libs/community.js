const plugin = {};
const Categories = require.main.require('./src/categories');
const Base = require('./base');

const getCommunity = async (params) => {
  const cid = await Categories.getCidByHandle(params.handle);
  if (!cid) return null;
  return cid;
};

class Community extends Base {
  static async Index(req, res, next) {
    try {
      const cid = await getCommunity(req.params);
      if (!cid) return next();
      req.params.category_id = cid;
      req.params.slug = `${cid}/${req.params.handle}`;
      Community.controllers.category.get(req, res, next);
    } catch (err) {
      console.error('Error loading category by slug:', err);
      return next(err);
    }
  }

  static async customizeIndexLink(data) {
    const { categories } = data.templateData;
    categories.forEach(category => {
      category.link = `/${category.handle}`;
      if (!category.children) return;
      category.children.forEach(child => {
        child.link = `/${category.handle}/${child.cid}-${child.handle}`;
      });
    });
    return data;
  }

  static async createCommunityLink(data) {
    const { headerLinks } = data.templateData;
    headerLinks.push({
      text: 'Create Community',
      url: '/create-community'
    });
  }
}

module.exports = Community;