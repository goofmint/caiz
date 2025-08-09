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

    // Create a community managers group (example: community-{cid}-managers)
    const managerGroupName = `community-${cid}-managers`;
    const managerGroupDesc = `Managers of Community: ${name}`;
    await Community.createCommunityGroup(managerGroupName, managerGroupDesc, uid, 0, 0);
    
    // Create a community members group (example: community-{cid}-members)
    const communityGroupName = `community-${cid}-members`;
    const communityGroupDesc = `Members of Community: ${name}`;
    await Community.createCommunityGroup(communityGroupName, communityGroupDesc, uid, 0, 0);
    
    // Create a community banned group (example: community-{cid}-banned)
    const communityBanGroupName = `community-${cid}-banned`;
    const communityBanGroupDesc = `Banned members of Community: ${name}`;
    await Community.createCommunityGroup(communityBanGroupName, communityBanGroupDesc, uid, 1, 1);
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

  static async GetSubCategories(socket, { cid }) {
    winston.info(`[plugin/caiz] Getting subcategories for cid: ${cid}, uid: ${socket.uid}`);
    
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
    
    // Get subcategories
    const subcategoryIds = await db.getSortedSetRange(`cid:${cid}:children`, 0, -1);
    if (!subcategoryIds.length) {
      return [];
    }
    
    const subcategories = await Categories.getCategoriesData(subcategoryIds);
    
    // Sort by order and return relevant fields
    return subcategories
      .filter(cat => cat && !cat.disabled)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(cat => ({
        cid: cat.cid,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        bgColor: cat.bgColor,
        order: cat.order,
        postcount: cat.postcount || 0,
        topiccount: cat.topiccount || 0
      }));
  }

  static async CreateSubCategory(socket, data) {
    winston.info(`[plugin/caiz] Creating subcategory for cid: ${data.parentCid}, uid: ${socket.uid}`);
    winston.info(`[plugin/caiz] Subcategory data:`, JSON.stringify(data, null, 2));
    
    const { uid } = socket;
    const { parentCid, name, description, icon, color, bgColor } = data;
    
    if (!uid) {
      throw new Error('Authentication required');
    }
    
    if (!name || !name.trim()) {
      throw new Error('Category name is required');
    }
    
    // Check ownership
    const ownerGroup = await db.getObjectField(`category:${parentCid}`, 'ownerGroup');
    const isOwner = await Groups.isMember(uid, ownerGroup);
    
    if (!isOwner) {
      throw new Error('Permission denied');
    }
    
    // Check for duplicate names within the same parent
    const existingSubcategories = await Community.GetSubCategories(socket, { cid: parentCid });
    const nameExists = existingSubcategories.some(cat => 
      cat.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (nameExists) {
      throw new Error('A category with this name already exists');
    }
    
    // Get next order number
    const maxOrder = Math.max(0, ...existingSubcategories.map(cat => cat.order || 0));
    const order = maxOrder + 1;
    
    // Create subcategory
    const categoryData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      parentCid: parentCid,
      order: order
    };
    
    // Add optional fields
    if (icon) categoryData.icon = icon;
    if (color) categoryData.color = color;
    if (bgColor) categoryData.bgColor = bgColor;
    
    const newCategory = await Categories.create(categoryData);
    winston.info(`[plugin/caiz] Subcategory created: ${newCategory.cid}`);
    
    return {
      success: true,
      category: {
        cid: newCategory.cid,
        name: newCategory.name,
        description: newCategory.description,
        icon: newCategory.icon,
        color: newCategory.color,
        bgColor: newCategory.bgColor,
        order: newCategory.order,
        postcount: 0,
        topiccount: 0
      }
    };
  }

  static async UpdateSubCategory(socket, data) {
    winston.info(`[plugin/caiz] Updating subcategory: ${data.cid}, uid: ${socket.uid}`);
    winston.info(`[plugin/caiz] Update data:`, JSON.stringify(data, null, 2));
    
    const { uid } = socket;
    const { cid, parentCid, name, description, icon, color, bgColor } = data;
    
    if (!uid || !cid) {
      throw new Error('Authentication and category ID required');
    }
    
    if (!name || !name.trim()) {
      throw new Error('Category name is required');
    }
    
    // Check ownership of parent community
    const ownerGroup = await db.getObjectField(`category:${parentCid}`, 'ownerGroup');
    const isOwner = await Groups.isMember(uid, ownerGroup);
    
    if (!isOwner) {
      throw new Error('Permission denied');
    }
    
    // Verify subcategory exists and belongs to parent
    const subcategory = await Categories.getCategoryData(cid);
    if (!subcategory || subcategory.parentCid != parentCid) {
      throw new Error('Subcategory not found or access denied');
    }
    
    // Check for duplicate names (excluding current category)
    const existingSubcategories = await Community.GetSubCategories(socket, { cid: parentCid });
    const nameExists = existingSubcategories.some(cat => 
      cat.cid != cid && cat.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (nameExists) {
      throw new Error('A category with this name already exists');
    }
    
    // Prepare update data
    const updateData = {
      name: name.trim(),
      description: description ? description.trim() : ''
    };
    
    // Handle optional fields
    if (icon !== undefined) updateData.icon = icon || '';
    if (color !== undefined) updateData.color = color || '';
    if (bgColor !== undefined) updateData.bgColor = bgColor || '';
    
    // Update category
    const modifiedData = { [cid]: updateData };
    await Categories.update(modifiedData);
    
    winston.info(`[plugin/caiz] Subcategory updated: ${cid}`);
    
    return { success: true };
  }

  static async DeleteSubCategory(socket, { cid, parentCid }) {
    winston.info(`[plugin/caiz] Deleting subcategory: ${cid}, parent: ${parentCid}, uid: ${socket.uid}`);
    
    const { uid } = socket;
    
    if (!uid || !cid || !parentCid) {
      throw new Error('Authentication, category ID, and parent ID required');
    }
    
    // Check ownership of parent community
    const ownerGroup = await db.getObjectField(`category:${parentCid}`, 'ownerGroup');
    const isOwner = await Groups.isMember(uid, ownerGroup);
    
    if (!isOwner) {
      throw new Error('Permission denied');
    }
    
    // Verify subcategory exists and belongs to parent
    const subcategory = await Categories.getCategoryData(cid);
    if (!subcategory || subcategory.parentCid != parentCid) {
      throw new Error('Subcategory not found or access denied');
    }
    
    // Check if category has any topics
    const topicCount = await db.sortedSetCard(`cid:${cid}:tids`);
    if (topicCount > 0) {
      throw new Error(`Cannot delete category with ${topicCount} topics. Please move or delete topics first.`);
    }
    
    // Check if category has any subcategories
    const subcategoryCount = await db.sortedSetCard(`cid:${cid}:children`);
    if (subcategoryCount > 0) {
      throw new Error('Cannot delete category with subcategories. Please delete subcategories first.');
    }
    
    // Delete the category
    await Categories.purge(cid, uid);
    
    winston.info(`[plugin/caiz] Subcategory deleted: ${cid}`);
    
    return { success: true };
  }

  static async ReorderSubCategories(socket, { parentCid, categoryIds }) {
    winston.info(`[plugin/caiz] Reordering subcategories for parent: ${parentCid}, uid: ${socket.uid}`);
    winston.info(`[plugin/caiz] New order:`, categoryIds);
    
    const { uid } = socket;
    
    if (!uid || !parentCid || !Array.isArray(categoryIds)) {
      throw new Error('Authentication, parent ID, and category order required');
    }
    
    // Check ownership of parent community
    const ownerGroup = await db.getObjectField(`category:${parentCid}`, 'ownerGroup');
    const isOwner = await Groups.isMember(uid, ownerGroup);
    
    if (!isOwner) {
      throw new Error('Permission denied');
    }
    
    // Verify all categories belong to this parent
    const existingSubcategories = await Community.GetSubCategories(socket, { cid: parentCid });
    const existingIds = existingSubcategories.map(cat => parseInt(cat.cid));
    const requestedIds = categoryIds.map(id => parseInt(id));
    
    // Check if all requested IDs exist and belong to parent
    const invalidIds = requestedIds.filter(id => !existingIds.includes(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid category IDs: ${invalidIds.join(', ')}`);
    }
    
    // Check if all existing categories are included
    if (requestedIds.length !== existingIds.length) {
      throw new Error('All categories must be included in reorder operation');
    }
    
    try {
      // Update order for each category
      const updates = {};
      
      for (let i = 0; i < categoryIds.length; i++) {
        const cid = parseInt(categoryIds[i]);
        const newOrder = i + 1;
        updates[cid] = { order: newOrder };
      }
      
      // Apply updates using Categories.update
      await Categories.update(updates);
      
      winston.info(`[plugin/caiz] Subcategories reordered successfully for parent: ${parentCid}`);
      
      return { success: true };
    } catch (error) {
      winston.error(`[plugin/caiz] Error reordering subcategories:`, error);
      throw new Error('Failed to reorder categories');
    }
  }

  // Member Management Methods
  
  static async GetMembers(socket, { cid }) {
    winston.info(`[plugin/caiz] Getting members for cid: ${cid}, uid: ${socket.uid}`);
    
    const { uid } = socket;
    if (!uid) {
      throw new Error('Authentication required');
    }
    
    // Check if user has permission to view members (owner or manager)
    const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
    if (!ownerGroup) {
      winston.error(`[plugin/caiz] No owner group found for cid: ${cid}`);
      throw new Error('Community configuration error');
    }
    
    const managerGroup = `community-${cid}-managers`;
    
    const isOwner = await Groups.isMember(uid, ownerGroup);
    const isManager = await Groups.isMember(uid, managerGroup);
    
    if (!isOwner && !isManager) {
      winston.info(`[plugin/caiz] User ${uid} does not have permission to view members`);
      throw new Error('Permission denied');
    }
    
    try {
      const members = [];
      const groups = [
        { name: ownerGroup, role: 'owner' },
        { name: managerGroup, role: 'manager' },
        { name: `community-${cid}-members`, role: 'member' },
        { name: `community-${cid}-banned`, role: 'banned' }
      ];
      
      for (const group of groups) {
        const groupExists = await Groups.exists(group.name);
        if (!groupExists) {
          winston.info(`[plugin/caiz] Group ${group.name} does not exist, skipping`);
          continue;
        }
        
        const memberUids = await db.getSortedSetRange(`group:${group.name}:members`, 0, -1);
        winston.info(`[plugin/caiz] Found ${memberUids.length} members in group ${group.name}`);
        
        if (memberUids.length > 0) {
          const Users = require.main.require('./src/user');
          const userData = await Users.getUsersFields(memberUids, [
            'uid', 'username', 'userslug', 'picture', 'joindate', 'lastonline', 'status'
          ]);
          
          userData.forEach(user => {
            if (user && user.uid) {
              members.push({
                ...user,
                role: group.role,
                joindate: parseInt(user.joindate) || Date.now(),
                lastonline: parseInt(user.lastonline) || Date.now()
              });
            }
          });
        }
      }
      
      // Sort by role priority, then by username
      const roleOrder = { owner: 0, manager: 1, member: 2, banned: 3 };
      members.sort((a, b) => {
        if (roleOrder[a.role] !== roleOrder[b.role]) {
          return roleOrder[a.role] - roleOrder[b.role];
        }
        return a.username.localeCompare(b.username);
      });
      
      winston.info(`[plugin/caiz] Returning ${members.length} members for cid: ${cid}`);
      return members;
      
    } catch (error) {
      winston.error(`[plugin/caiz] Error getting members:`, error);
      throw new Error(`Failed to get members: ${error.message}`);
    }
  }

  static async AddMember(socket, { cid, username }) {
    winston.info(`[plugin/caiz] Adding member ${username} to cid: ${cid}, uid: ${socket.uid}`);
    
    const { uid } = socket;
    if (!uid || !username) {
      throw new Error('Authentication and username required');
    }
    
    // Check permissions (owner or manager can add members)
    const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
    const managerGroup = `community-${cid}-managers`;
    
    const isOwner = await Groups.isMember(uid, ownerGroup);
    const isManager = await Groups.isMember(uid, managerGroup);
    
    if (!isOwner && !isManager) {
      throw new Error('Permission denied');
    }
    
    try {
      // Get user data
      const Users = require.main.require('./src/user');
      const targetUser = await Users.getUserDataByUsername(username);
      
      if (!targetUser || !targetUser.uid) {
        throw new Error('User not found');
      }
      
      // Check if user is already a member in any role
      const memberGroups = [
        ownerGroup,
        managerGroup,
        `community-${cid}-members`,
        `community-${cid}-banned`
      ];
      
      for (const groupName of memberGroups) {
        const groupExists = await Groups.exists(groupName);
        if (groupExists && await Groups.isMember(targetUser.uid, groupName)) {
          throw new Error('User is already a member of this community');
        }
      }
      
      // Add user to members group
      const memberGroupName = `community-${cid}-members`;
      await Groups.join(memberGroupName, targetUser.uid);
      
      winston.info(`[plugin/caiz] User ${username} added to community ${cid}`);
      
      return {
        success: true,
        user: {
          uid: targetUser.uid,
          username: targetUser.username,
          userslug: targetUser.userslug,
          picture: targetUser.picture,
          role: 'member',
          joindate: Date.now(),
          lastonline: targetUser.lastonline || Date.now(),
          status: targetUser.status || 'online'
        }
      };
      
    } catch (error) {
      winston.error(`[plugin/caiz] Error adding member:`, error);
      throw error;
    }
  }

  static async ChangeMemberRole(socket, { cid, targetUid, newRole }) {
    winston.info(`[plugin/caiz] Changing role for uid ${targetUid} to ${newRole} in cid: ${cid}, by uid: ${socket.uid}`);
    
    const { uid } = socket;
    if (!uid || !targetUid || !newRole) {
      throw new Error('Authentication, target user, and new role required');
    }
    
    const validRoles = ['owner', 'manager', 'member', 'banned'];
    if (!validRoles.includes(newRole)) {
      throw new Error('Invalid role');
    }
    
    // Check permissions
    const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
    const isOwner = await Groups.isMember(uid, ownerGroup);
    
    // Only owners can change roles to/from owner or banned
    if ((newRole === 'owner' || newRole === 'banned') && !isOwner) {
      throw new Error('Permission denied - only owners can assign owner or banned roles');
    }
    
    // Check if user is trying to change their own role inappropriately
    if (uid === targetUid) {
      const currentUserRole = await Community.getUserRole(uid, cid);
      
      // Owners can only demote themselves if there are other owners
      if (currentUserRole === 'owner' && newRole !== 'owner') {
        const ownerMembers = await db.getSortedSetRange(`group:${ownerGroup}:members`, 0, -1);
        if (ownerMembers.length <= 1) {
          throw new Error('Cannot remove the last owner of the community');
        }
      }
      
      // Non-owners cannot promote themselves
      if (currentUserRole !== 'owner' && (newRole === 'owner' || newRole === 'manager')) {
        throw new Error('Cannot promote yourself');
      }
    }
    
    try {
      // Remove user from all community groups
      const allGroups = [
        ownerGroup,
        `community-${cid}-managers`,
        `community-${cid}-members`,
        `community-${cid}-banned`
      ];
      
      for (const groupName of allGroups) {
        const groupExists = await Groups.exists(groupName);
        if (groupExists) {
          await Groups.leave(groupName, targetUid);
        }
      }
      
      // Add user to appropriate group based on new role
      let targetGroup;
      switch (newRole) {
        case 'owner':
          targetGroup = ownerGroup;
          break;
        case 'manager':
          targetGroup = `community-${cid}-managers`;
          break;
        case 'member':
          targetGroup = `community-${cid}-members`;
          break;
        case 'banned':
          targetGroup = `community-${cid}-banned`;
          break;
      }
      
      await Groups.join(targetGroup, targetUid);
      
      winston.info(`[plugin/caiz] User ${targetUid} role changed to ${newRole} in community ${cid}`);
      
      return { success: true };
      
    } catch (error) {
      winston.error(`[plugin/caiz] Error changing member role:`, error);
      throw error;
    }
  }

  static async RemoveMember(socket, { cid, targetUid }) {
    winston.info(`[plugin/caiz] Removing member uid ${targetUid} from cid: ${cid}, by uid: ${socket.uid}`);
    
    const { uid } = socket;
    if (!uid || !targetUid) {
      throw new Error('Authentication and target user required');
    }
    
    // Check permissions (owner or manager)
    const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
    const managerGroup = `community-${cid}-managers`;
    
    const isOwner = await Groups.isMember(uid, ownerGroup);
    const isManager = await Groups.isMember(uid, managerGroup);
    
    if (!isOwner && !isManager) {
      throw new Error('Permission denied');
    }
    
    // Check if trying to remove an owner (only owners can remove owners)
    const targetIsOwner = await Groups.isMember(targetUid, ownerGroup);
    if (targetIsOwner && !isOwner) {
      throw new Error('Permission denied - only owners can remove owners');
    }
    
    // Prevent removing the last owner
    if (targetIsOwner) {
      const ownerMembers = await db.getSortedSetRange(`group:${ownerGroup}:members`, 0, -1);
      if (ownerMembers.length <= 1) {
        throw new Error('Cannot remove the last owner of the community');
      }
    }
    
    try {
      // Remove user from all community groups
      const allGroups = [
        ownerGroup,
        `community-${cid}-managers`,
        `community-${cid}-members`,
        `community-${cid}-banned`
      ];
      
      for (const groupName of allGroups) {
        const groupExists = await Groups.exists(groupName);
        if (groupExists) {
          await Groups.leave(groupName, targetUid);
        }
      }
      
      winston.info(`[plugin/caiz] User ${targetUid} removed from community ${cid}`);
      
      return { success: true };
      
    } catch (error) {
      winston.error(`[plugin/caiz] Error removing member:`, error);
      throw error;
    }
  }

  // Helper method to get user's role in a community
  static async getUserRole(uid, cid) {
    const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
    
    if (await Groups.isMember(uid, ownerGroup)) return 'owner';
    if (await Groups.isMember(uid, `community-${cid}-managers`)) return 'manager';
    if (await Groups.isMember(uid, `community-${cid}-members`)) return 'member';
    if (await Groups.isMember(uid, `community-${cid}-banned`)) return 'banned';
    
    return null; // Not a member
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