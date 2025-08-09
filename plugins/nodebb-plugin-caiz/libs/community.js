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

  static async User(socket, data) {
    winston.info('[plugin/caiz] User socket method called');
    const { uid } = socket;
    winston.info(`[plugin/caiz] Socket uid: ${uid}`);
    if (!uid) {
      winston.error('[plugin/caiz] No uid in socket, user not logged in');
      throw new Error('Not logged in');
    }
    const communities = await Community.getUserCommunities(uid);
    winston.info(`[plugin/caiz] Returning ${communities.length} communities to client`);
    return communities;
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
      return Categories.create({ ...category, parentCid: cid, cloneFromCid: cid });
    }));

    winston.info(`[plugin/caiz] Community created: ${name} (CID: ${cid}), Owner: ${uid}, Owner Group: ${ownerGroupName}`);
    return newCategory;
  }

  static async getUserCommunities(uid) {
    winston.info(`[plugin/caiz] getUserCommunities for uid: ${uid}`);
    const watchedCids = await db.getSortedSetRange(`uid:${uid}:followed_cats`, 0, -1);
    winston.info(`[plugin/caiz] Found ${watchedCids.length} watched categories: ${JSON.stringify(watchedCids)}`);
    
    if (!watchedCids || watchedCids.length === 0) {
      return [];
    }
    
    const categoryData = await Categories.getCategoriesData(watchedCids);
    winston.info(`[plugin/caiz] Category data retrieved: ${categoryData.length} items`);
    
    // トップレベルカテゴリ（parentCid === 0）のみを表示
    const communities = categoryData.filter(cat => cat && cat.parentCid === 0);
    winston.info(`[plugin/caiz] Filtered to ${communities.length} top-level communities`);
    winston.info(`[plugin/caiz] All category data:`, categoryData.map(c => ({ cid: c.cid, name: c.name, parentCid: c.parentCid })));
    
    return communities;
  }

  static async Follow(socket, { cid }) {
    const { uid } = socket;
    if (!uid) throw new Error('Not logged in');
    await db.sortedSetAdd(`uid:${uid}:followed_cats`, Date.now(), cid);
    return { isFollowed: true };
  }

  static async Unfollow(socket, { cid }) {
    const { uid } = socket;
    if (!uid) throw new Error('Not logged in');
    await db.sortedSetRemove(`uid:${uid}:followed_cats`, cid);
    return { isFollowed: false };
  }

  static async IsFollowed(socket, { cid }) {
    const { uid } = socket;
    if (!uid) return { isFollowed: false };
    const isFollowed = await db.sortedSetScore(`uid:${uid}:followed_cats`, cid);
    return { isFollowed: isFollowed !== null };
  }

  static async IsCommunityOwner(socket, { cid }) {
    winston.info(`[plugin/caiz] Checking community owner for cid: ${cid}, uid: ${socket.uid}`);
    const { uid } = socket;
    if (!uid) {
      winston.info('[plugin/caiz] User not logged in, not owner');
      return { isOwner: false };
    }

    try {
      // Get category data to find owner group
      const category = await Categories.getCategoryData(cid);
      if (!category) {
        winston.warn(`[plugin/caiz] Category ${cid} not found`);
        return { isOwner: false };
      }

      const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
      if (!ownerGroup) {
        winston.info(`[plugin/caiz] No owner group found for category ${cid}`);
        return { isOwner: false };
      }

      // Check if user is in owner group
      const isOwner = await Groups.isMember(uid, ownerGroup);
      winston.info(`[plugin/caiz] User ${uid} owner status for category ${cid}: ${isOwner}`);
      
      return { isOwner };
    } catch (err) {
      winston.error(`[plugin/caiz] Error checking community owner: ${err.message}`);
      return { isOwner: false };
    }
  }

  static async GetCommunityData(socket, { cid }) {
    winston.info(`[plugin/caiz] Getting community data for cid: ${cid}, uid: ${socket.uid}`);
    
    const { uid } = socket;
    if (!uid) {
      throw new Error('Authentication required');
    }
    
    // Check ownership
    const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
    const isOwner = await Groups.isMember(uid, ownerGroup);
    
    if (!isOwner) {
      throw new Error('Permission denied');
    }
    
    // Get category data
    const categoryData = await Categories.getCategoryData(cid);
    
    return {
      name: categoryData.name,
      description: categoryData.description,
      backgroundImage: categoryData.backgroundImage,
      icon: categoryData.icon,
      color: categoryData.color,
      bgColor: categoryData.bgColor
    };
  }

  static async UpdateCommunityData(socket, data) {
    winston.info(`[plugin/caiz] Updating community data for cid: ${data.cid}, uid: ${socket.uid}`);
    winston.info(`[plugin/caiz] Received data:`, JSON.stringify(data, null, 2));
    
    const { uid } = socket;
    const { cid, name, description, backgroundImage, icon, color, bgColor } = data;
    
    if (!uid) {
      winston.error(`[plugin/caiz] Authentication required for cid: ${cid}`);
      throw new Error('Authentication required');
    }
    
    // Check ownership
    const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
    winston.info(`[plugin/caiz] Owner group for cid ${cid}: ${ownerGroup}`);
    
    const isOwner = await Groups.isMember(uid, ownerGroup);
    winston.info(`[plugin/caiz] User ${uid} is owner: ${isOwner}`);
    
    if (!isOwner) {
      winston.error(`[plugin/caiz] Permission denied for uid ${uid}, cid ${cid}`);
      throw new Error('Permission denied');
    }
    
    // Validate input
    if (!name) {
      winston.error(`[plugin/caiz] Name is required but not provided`);
      throw new Error('Name is required');
    }
    
    // Update category (excluding slug - it's auto-generated)
    const updateData = {
      name: name.trim(),
      description: description ? description.trim() : '',
    };
    
    // Handle icon and backgroundImage updates
    if (backgroundImage !== undefined) {
      if (backgroundImage) {
        updateData.backgroundImage = backgroundImage.trim();
        // Clear icon when backgroundImage is set to avoid overlap
        updateData.icon = '';
        winston.info(`[plugin/caiz] Including background image: ${backgroundImage}`);
        winston.info(`[plugin/caiz] Clearing icon to avoid overlap with background image`);
      } else {
        // Clear backgroundImage if empty string is provided
        updateData.backgroundImage = '';
        winston.info(`[plugin/caiz] Clearing background image`);
      }
    }
    
    if (icon !== undefined) {
      if (icon) {
        updateData.icon = icon.trim();
        // Clear backgroundImage when icon is set
        updateData.backgroundImage = '';
        winston.info(`[plugin/caiz] Including icon: ${icon}`);
        winston.info(`[plugin/caiz] Clearing background image to use icon instead`);
      } else {
        // Clear icon if empty string is provided
        updateData.icon = '';
        winston.info(`[plugin/caiz] Clearing icon`);
      }
    }
    
    // Handle color updates
    if (color !== undefined) {
      updateData.color = color || '';
      winston.info(`[plugin/caiz] Setting icon color: ${color || 'default'}`);
    }
    
    if (bgColor !== undefined) {
      updateData.bgColor = bgColor || '';
      winston.info(`[plugin/caiz] Setting background color: ${bgColor || 'default'}`);
    }
    
    winston.info(`[plugin/caiz] Update data prepared:`, JSON.stringify(updateData, null, 2));
    
    try {
      // Categories.update expects an object with cid as key
      const modifiedData = { [cid]: updateData };
      await Categories.update(modifiedData);
      winston.info(`[plugin/caiz] Categories.update completed for cid: ${cid}`);
    } catch (updateError) {
      winston.error(`[plugin/caiz] Categories.update failed:`, updateError);
      throw updateError;
    }
    
    winston.info(`[plugin/caiz] Community data updated successfully for cid: ${cid}`);
    
    return { success: true };
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