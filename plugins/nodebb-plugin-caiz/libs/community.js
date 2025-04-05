const plugin = {};
const db = require.main.require('./src/database');
const Plugins = require.main.require('./src/plugins');
const winston = require.main.require('winston'); 
const Categories = require.main.require('./src/categories');
const Privileges = require.main.require('./src/privileges');
const Groups = require.main.require('./src/groups');
const Base = require('./base');
const websockets = require.main.require('./src/socket.io/plugins');
const initialCategories = require.main.require('./install/data/categories.json'); 

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

  static async Create(socket, data) {
      const { name, description } = data;
      winston.info(`[plugin/caiz] Creating community: ${name}`);
      const { uid } = socket;
      if (!uid) {
        throw new Error('Not logged in');
      }
      if (!name || name.length < 3) { // 簡単なバリデーション
        throw new Error('Community name is too short');
      }  
      try {
        const community = await Community.createCommunity(uid, { name, description });
        return {
          message: 'Community created successfully!',
          community: community,
        };
      } catch (err) {
        winston.error(`[plugin/caiz] Error creating community: ${err.message}`);
        throw err;
      }
  };

  static async User(req, res, next) {
    if (!req.loggedIn) {
      return res.json({ error: 'Not logged in' });
    }
    const categories = await Community.getUserCommunities(req.uid);
    res.json(categories);
  }

  static async createCommunityGroup(name, description, ownerUid, privateFlag = 0, hidden = 0) {
    const group = await Groups.getGroupData(name);
    if (group) return group;
    return Groups.create({
      name,
      description,
      private: privateFlag,
      hidden,
      ownerUid
    });
  }

  static async createCommunity(uid, { name, description }) {
    const ownerPrivileges = await Privileges.categories.getGroupPrivilegeList();
    const guestPrivileges = ['groups:find', 'groups:read', 'groups:topics:read'];
    // Create a new top-level category
    const categoryData = {
        name,
        description: description || '',
        order: 100,
        parentCid: 0, // Top Level
        customFields: {
          isCommunity: true
        },
        icon: 'fa-users', // Category Icon Example
    };

    const newCategory = await Categories.create(categoryData);
    const cid = newCategory.cid;

    // Update the category privileges

    // Create a community owner group (example: community-{cid}-owners)
    const ownerGroupName = `community-${cid}-owners`;
    const ownerGroupDesc = `Owners of Community: ${name}`;
    await Community.createCommunityGroup(ownerGroupName, ownerGroupDesc, uid, 1, 1);
    await Groups.join(ownerGroupName, uid);

    // Create a community group (example: community-{cid}-members)
    const communityGroupName = `community-${cid}-members`;
    const communityGroupDesc = `Members of Community: ${name}`;
    await Community.createCommunityGroup(communityGroupName, communityGroupDesc, uid, 0, 0);
    await Groups.leave(communityGroupName, uid);
    // Create a community banned group (example: community-{cid}-banned)
    const communityBanGroupName = `community-${cid}-banned`;
    const communityBanGroupDesc = `Banned members of Community: ${name}`;
    await Community.createCommunityGroup(communityBanGroupName, communityBanGroupDesc, uid, 1, 1);
    await Groups.leave(communityBanGroupName, uid);
    // Save the owner group name in category data
    await db.setObjectField(`category:${cid}`, 'ownerGroup', ownerGroupName);
    await db.sortedSetAdd(`uid:${uid}:followed_cats`, Date.now(), cid);
    
    await Privileges.categories.give(ownerPrivileges, cid, ownerGroupName);
    const communityPrivileges = ownerPrivileges.filter(p => p !== 'groups:posts:view_deleted' && p !== 'groups:purge' && p !== 'groups:moderate');
    await Privileges.categories.give(communityPrivileges, cid, communityGroupName);
    await Privileges.categories.give([], cid, communityBanGroupName);
    await Privileges.categories.rescind(ownerPrivileges, cid, 'guests');
    await Privileges.categories.give(guestPrivileges, cid, 'guests');
    await Privileges.categories.rescind(ownerPrivileges, cid, 'registered-users');
    await Privileges.categories.give(guestPrivileges, cid, 'registered-users');
    await Privileges.categories.give([], cid, 'banned-users');

    // TODO: Create child categories in the community
    await Promise.all(initialCategories.map((category) => {
      return Categories.create({...category, parentCid: cid, cloneFromCid: cid});
    }));

    winston.info(`[plugin/caiz] Community created: ${name} (CID: ${cid}), Owner: ${uid}, Owner Group: ${ownerGroupName}`);
    return newCategory;
  }

  static async getUserCommunities(uid) {
    const categoryIds = new Set();
    const watchedCids = await db.getSortedSetRange(`uid:${uid}:followed_cats`, 0, -1);
    winston.info(watchedCids);
    watchedCids.forEach(cid => categoryIds.add(parseInt(cid, 10)));
    const uniqueCids = Array.from(watchedCids);
    const categoryData = await Categories.getCategoriesData(uniqueCids, uid);
    return categoryData.filter(cat => cat && cat.parentCid === 0);
  }

  static async Follow(uid, { cid }) {
    if (!uid) throw new Error('Not logged in');
    await db.sortedSetAdd(`uid:${uid}:followed_cats`, Date.now(), cid);
    return { isFollowed: true };
  }

  static async Unfollow(uid, { cid }) {
    if (!uid) throw new Error('Not logged in');
    await db.sortedSetRemove(`uid:${uid}:followed_cats`, cid);
    return { isFollowed: false };
  }

  static async IsFollowed(uid, { cid }) {
    if (!uid) return { isFollowed: false };
    const isFollowed = await db.sortedSetScore(`uid:${uid}:followed_cats`, cid);
    return { isFollowed: isFollowed !== null };
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