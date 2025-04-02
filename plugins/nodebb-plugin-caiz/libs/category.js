const Categories = require.main.require('./src/categories');
const Base = require('./base');

class Category extends Base {
  
  static async Index (req, res, next) {
    try {
      const cid = req.params.cid.split('-')[0];
      const communityId = await Categories.getCidByHandle(req.params.handle);
      const category = await Categories.getCategoryData(cid);
      if (!category || !communityId) return next(); // 見つからなかった場合は404へ
      if (category.parentCid !== communityId) {
        return next();
      }
      req.params.category_id = category.cid;
      req.params.slug = category.slug;
      Category.controllers.category.get(req, res, next);
    } catch (err) {
      console.error('Error loading category by slug:', err);
      return next(err);
    }
  }

  static async customizeLink(data) {
    console.log(data);
    return data;
    header.navigation.push({
      route: '#', // 実際のページ遷移はしない
      title: '[[plugin-community-creator:create_community]]', // 翻訳キー
      iconClass: 'fa-plus-square', // FontAwesomeアイコン
      textClass: 'visible-xs-inline',
      // モーダルを開くための識別子 (idやclass) を追加
      properties: {
        id: 'create-community-trigger'
      }
    });
    callback(null, header);
  }
}

module.exports = Category;