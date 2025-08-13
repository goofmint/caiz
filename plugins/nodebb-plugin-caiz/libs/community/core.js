const winston = require.main.require('winston');
const Privileges = require.main.require('./src/privileges');
const initialCategories = require.main.require('./install/data/categories.json');
const data = require('./data');
const permissions = require('./permissions');
const { ROLES, GROUP_SUFFIXES, getGroupName, GUEST_PRIVILEGES } = require('./shared/constants');

/**
 * Core community operations
 */

async function createCommunity(uid, { name, description }) {
  const ownerPrivileges = await Privileges.categories.getGroupPrivilegeList();
  
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

  const newCategory = await data.createCategory(categoryData);
  const cid = newCategory.cid;

  // Create community groups
  const ownerGroupName = getGroupName(cid, GROUP_SUFFIXES.OWNERS);
  const ownerGroupDesc = `Owners of Community: ${name}`;
  await permissions.createCommunityGroup(ownerGroupName, ownerGroupDesc, uid, 1, 1);
  await data.joinGroup(ownerGroupName, uid);
  winston.info(`[plugin/caiz] Added user ${uid} to owner group ${ownerGroupName}`);

  // Create a community managers group
  const managerGroupName = getGroupName(cid, GROUP_SUFFIXES.MANAGERS);
  const managerGroupDesc = `Managers of Community: ${name}`;
  await permissions.createCommunityGroup(managerGroupName, managerGroupDesc, uid, 0, 0);
  
  // Create a community members group
  const communityGroupName = getGroupName(cid, GROUP_SUFFIXES.MEMBERS);
  const communityGroupDesc = `Members of Community: ${name}`;
  await permissions.createCommunityGroup(communityGroupName, communityGroupDesc, uid, 0, 0);
  
  // Create a community banned group
  const communityBanGroupName = getGroupName(cid, GROUP_SUFFIXES.BANNED);
  const communityBanGroupDesc = `Banned members of Community: ${name}`;
  await permissions.createCommunityGroup(communityBanGroupName, communityBanGroupDesc, uid, 1, 1);
  
  // Save the owner group name in category data
  await data.setObjectField(`category:${cid}`, 'ownerGroup', ownerGroupName);
  await data.sortedSetAdd(`uid:${uid}:followed_cats`, Date.now(), cid);

  // Set up privileges
  await Privileges.categories.give(ownerPrivileges, cid, ownerGroupName);
  const communityPrivileges = ownerPrivileges.filter(p => p !== 'groups:posts:view_deleted' && p !== 'groups:purge' && p !== 'groups:moderate');
  await Privileges.categories.give(communityPrivileges, cid, communityGroupName);
  await Privileges.categories.give([], cid, communityBanGroupName);
  await Privileges.categories.rescind(ownerPrivileges, cid, 'guests');
  await Privileges.categories.give(GUEST_PRIVILEGES, cid, 'guests');
  await Privileges.categories.rescind(ownerPrivileges, cid, 'registered-users');
  await Privileges.categories.give(GUEST_PRIVILEGES, cid, 'registered-users');
  await Privileges.categories.give([], cid, 'banned-users');

  // Manager グループへのモデレーション権限付与（新規追加）
  const moderationPrivileges = ['read', 'topics:read', 'moderate'];
  await Privileges.categories.give(moderationPrivileges, cid, managerGroupName);
  winston.info(`[plugin/caiz] Moderation privileges granted to manager group: ${managerGroupName}`);

  // Create child categories in the community
  await Promise.all(initialCategories.map((category) => {
    return data.createCategory({ ...category, parentCid: cid, cloneFromCid: cid });
  }));

  winston.info(`[plugin/caiz] Community created: ${name} (CID: ${cid}), Owner: ${uid}, Owner Group: ${ownerGroupName}`);
  return newCategory;
}

async function getUserCommunities(uid) {
  winston.info(`[plugin/caiz] getUserCommunities for uid: ${uid}`);
  const watchedCids = await data.getSortedSetRange(`uid:${uid}:followed_cats`, 0, -1);
  winston.info(`[plugin/caiz] Found ${watchedCids.length} watched categories: ${JSON.stringify(watchedCids)}`);
  
  if (!watchedCids || watchedCids.length === 0) {
    return [];
  }
  
  const categoryData = await data.getCategoriesData(watchedCids);
  winston.info(`[plugin/caiz] Category data retrieved: ${categoryData.length} items`);
  
  // Filter to top-level categories only
  const communities = categoryData.filter(cat => cat && cat.parentCid === 0);
  winston.info(`[plugin/caiz] Filtered to ${communities.length} top-level communities`);
  winston.info(`[plugin/caiz] All category data:`, categoryData.map(c => ({ cid: c.cid, name: c.name, parentCid: c.parentCid })));
  
  return communities;
}

async function Follow(socket, { cid }) {
  const { uid } = socket;
  if (!uid) throw new Error('Not logged in');
  
  winston.info(`[plugin/caiz] User ${uid} following community ${cid}`);
  
  // Add to followed categories
  await data.sortedSetAdd(`uid:${uid}:followed_cats`, Date.now(), cid);
  
  // Check if user is already a member of any community group
  const memberGroups = [
    await data.getObjectField(`category:${cid}`, 'ownerGroup'),
    getGroupName(cid, GROUP_SUFFIXES.MANAGERS),
    getGroupName(cid, GROUP_SUFFIXES.MEMBERS),
    getGroupName(cid, GROUP_SUFFIXES.BANNED)
  ];
  
  let isAlreadyMember = false;
  for (const groupName of memberGroups) {
    if (groupName && await data.groupExists(groupName) && await data.isMemberOfGroup(uid, groupName)) {
      winston.info(`[plugin/caiz] User ${uid} is already member of group ${groupName}`);
      isAlreadyMember = true;
      break;
    }
  }
  
  // If not already a member, add to members group
  if (!isAlreadyMember) {
    const memberGroupName = getGroupName(cid, GROUP_SUFFIXES.MEMBERS);
    if (await data.groupExists(memberGroupName)) {
      await data.joinGroup(memberGroupName, uid);
      winston.info(`[plugin/caiz] Added user ${uid} to member group ${memberGroupName}`);
    } else {
      winston.warn(`[plugin/caiz] Member group ${memberGroupName} does not exist for community ${cid}`);
    }
  }
  
  return { isFollowed: true };
}

async function Unfollow(socket, { cid }) {
  const { uid } = socket;
  if (!uid) throw new Error('Not logged in');
  
  winston.info(`[plugin/caiz] User ${uid} unfollowing community ${cid}`);
  
  // Remove from followed categories
  await data.sortedSetRemove(`uid:${uid}:followed_cats`, cid);
  
  // Check if user is just a regular member (not owner/manager) and remove them
  const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
  const managerGroup = getGroupName(cid, GROUP_SUFFIXES.MANAGERS);
  const memberGroup = getGroupName(cid, GROUP_SUFFIXES.MEMBERS);
  
  const isOwner = ownerGroup && await data.groupExists(ownerGroup) && await data.isMemberOfGroup(uid, ownerGroup);
  const isManager = await data.groupExists(managerGroup) && await data.isMemberOfGroup(uid, managerGroup);
  
  // Only remove regular members, not owners or managers
  if (!isOwner && !isManager) {
    if (await data.groupExists(memberGroup) && await data.isMemberOfGroup(uid, memberGroup)) {
      await data.leaveGroup(memberGroup, uid);
      winston.info(`[plugin/caiz] Removed user ${uid} from member group ${memberGroup}`);
    }
  } else {
    winston.info(`[plugin/caiz] User ${uid} is owner/manager, not removing from member groups`);
  }
  
  return { isFollowed: false };
}

async function IsFollowed(socket, { cid }) {
  const { uid } = socket;
  if (!uid) return { isFollowed: false };
  const isFollowed = await data.sortedSetScore(`uid:${uid}:followed_cats`, cid);
  return { isFollowed: isFollowed !== null };
}

async function GetCommunityData(socket, { cid }) {
  winston.info(`[plugin/caiz] Getting community data for cid: ${cid}, uid: ${socket.uid}`);
  
  const { uid } = socket;
  if (!uid) {
    throw new Error('Authentication required');
  }
  
  // Check ownership
  const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
  const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
  
  if (!isOwner) {
    throw new Error('Permission denied');
  }
  
  // Get category data
  const categoryData = await data.getCategoryData(cid);
  
  return {
    name: categoryData.name,
    description: categoryData.description,
    backgroundImage: categoryData.backgroundImage,
    icon: categoryData.icon,
    color: categoryData.color,
    bgColor: categoryData.bgColor
  };
}

async function UpdateCommunityData(socket, dataToUpdate) {
  winston.info(`[plugin/caiz] Updating community data for cid: ${dataToUpdate.cid}, uid: ${socket.uid}`);
  winston.info(`[plugin/caiz] Received data:`, JSON.stringify(dataToUpdate, null, 2));
  
  const { uid } = socket;
  const { cid, name, description, backgroundImage, icon, color, bgColor } = dataToUpdate;
  
  if (!uid) {
    winston.error(`[plugin/caiz] Authentication required for cid: ${cid}`);
    throw new Error('Authentication required');
  }
  
  // Check ownership
  const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
  winston.info(`[plugin/caiz] Owner group for cid ${cid}: ${ownerGroup}`);
  
  const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
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
    await data.updateCategory(modifiedData);
    winston.info(`[plugin/caiz] Categories.update completed for cid: ${cid}`);
  } catch (updateError) {
    winston.error(`[plugin/caiz] Categories.update failed:`, updateError);
    throw updateError;
  }
  
  winston.info(`[plugin/caiz] Community data updated successfully for cid: ${cid}`);
  
  return { success: true };
}

module.exports = {
  createCommunity,
  getUserCommunities,
  Follow,
  Unfollow,
  IsFollowed,
  GetCommunityData,
  UpdateCommunityData
};