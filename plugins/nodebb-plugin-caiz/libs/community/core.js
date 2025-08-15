const winston = require.main.require('winston');
const path = require('path');
const Privileges = require.main.require('./src/privileges');
const user = require.main.require('./src/user');
const meta = require.main.require('./src/meta');
const caizCategories = require(path.join(__dirname, '../../data/default-subcategories.json'));
const data = require('./data');
const permissions = require('./permissions');
const { ROLES, GROUP_SUFFIXES, getGroupName, GUEST_PRIVILEGES } = require('./shared/constants');

/**
 * Core community operations
 */

/**
 * Get the parent category (parentCid = 0) for a given category
 * @param {number} cid - Category ID
 * @returns {Promise<number>} Parent category ID
 */
async function getParentCategory(cid) {
  try {
    const Categories = require.main.require('./src/categories');
    const categoryData = await Categories.getCategoryData(cid);
    
    // If this is already a parent category, return it
    if (!categoryData || categoryData.parentCid === 0) {
      return cid;
    }
    
    // Find the parent community by traversing up
    let parentCategory = categoryData;
    while (parentCategory && parentCategory.parentCid !== 0) {
      parentCategory = await Categories.getCategoryData(parentCategory.parentCid);
    }
    
    if (parentCategory) {
      winston.info(`[plugin/caiz] Found parent category ${parentCategory.cid} for subcategory ${cid}`);
      return parentCategory.cid;
    }
    
    return cid; // Fallback to original cid
  } catch (err) {
    winston.error(`[plugin/caiz] Error finding parent category: ${err.message}`);
    return cid; // Fallback to original cid
  }
}

async function createCommunity(uid, { name, description }) {
  const ownerPrivileges = await Privileges.categories.getGroupPrivilegeList();
  
  winston.info(`[plugin/caiz] Creating community: ${JSON.stringify(ownerPrivileges)}`);
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
  const communityMemberName = getGroupName(cid, GROUP_SUFFIXES.MEMBERS);
  const communityMemberDesc = `Members of Community: ${name}`;
  await permissions.createCommunityGroup(communityMemberName, communityMemberDesc, uid, 0, 0);

  // Create a community banned group
  const communityBanGroupName = getGroupName(cid, GROUP_SUFFIXES.BANNED);
  const communityBanGroupDesc = `Banned members of Community: ${name}`;
  await permissions.createCommunityGroup(communityBanGroupName, communityBanGroupDesc, uid, 1, 1);
  
  // Save the owner group name in category data
  await data.setObjectField(`category:${cid}`, 'ownerGroup', ownerGroupName);
  await data.sortedSetAdd(`uid:${uid}:followed_cats`, Date.now(), cid);

  await Privileges.categories.give(ownerPrivileges, cid, ownerGroupName);
  // Set up privileges
  // マネージャー: 担当カテゴリ内の運営を想定
  // → ownerPrivileges から全域の物理削除権限などを除外
  const managerPrivileges = ownerPrivileges.filter(priv => 
    ![
      "groups:purge",        // 物理削除
    ].includes(priv)
  );
  await Privileges.categories.rescind(ownerPrivileges, cid, managerGroupName);
  await Privileges.categories.give(managerPrivileges, cid, managerGroupName);

  // Manager グループへのモデレーション権限付与（新規追加）
  const moderationPrivileges = ['groups:find', 'groups:read', 'groups:topics:read', 'groups:moderate'];
  await Privileges.categories.give(moderationPrivileges, cid, managerGroupName);
  winston.info(`[plugin/caiz] Moderation privileges granted to manager group: ${managerGroupName}`);

  // メンバー: 一般参加者を想定
  // → managerPrivileges からモデレーションや高度編集を除外
  const memberPrivileges = managerPrivileges.filter(priv =>
    ![
      "groups:topics:schedule",    // 公開日時予約
      "groups:topics:tag",         // タグ編集（必要なら許可可）
      "groups:posts:edit",         // 他人の投稿編集
      "groups:posts:history",      // 編集履歴閲覧
      "groups:posts:delete",       // 他人の投稿削除
      "groups:topics:delete",      // 他人のトピック削除
      "groups:posts:view_deleted", // 削除済み投稿閲覧
      "groups:moderate"            // モデレーション全般
    ].includes(priv)
  );
  await Privileges.categories.rescind(ownerPrivileges, cid, communityMemberName);
  await Privileges.categories.give(memberPrivileges, cid, communityMemberName);

  // const communityPrivileges = ownerPrivileges.filter(p => p !== 'groups:posts:view_deleted' && p !== 'groups:purge' && p !== 'groups:moderate' && p !== 'groups:topics:delete');
  await Privileges.categories.give([], cid, communityBanGroupName);
  await Privileges.categories.rescind(ownerPrivileges, cid, 'guests');
  await Privileges.categories.give(GUEST_PRIVILEGES, cid, 'guests');
  await Privileges.categories.rescind(ownerPrivileges, cid, 'registered-users');
  await Privileges.categories.give(GUEST_PRIVILEGES, cid, 'registered-users');
  await Privileges.categories.give([], cid, 'banned-users');

  // Create child categories in the community
  const categoriesToCreate = Array.isArray(caizCategories) ? caizCategories : [];
  if (!categoriesToCreate.length) {
    winston.warn('[plugin/caiz] No default subcategories found or invalid data shape; skipping child category creation.');
  } else {
    // Get user's language setting - default to English first
    let userLang = 'en-US'; // Default to English
    try {
      const userData = await user.getUserData(uid);
      const userSettings = await user.getSettings(uid);
      winston.info(`[plugin/caiz] User ${uid} userData.settings: ${JSON.stringify(userData && userData.settings)}`);
      winston.info(`[plugin/caiz] User ${uid} userSettings: ${JSON.stringify(userSettings)}`);
      winston.info(`[plugin/caiz] Meta config defaultLang: ${meta.config.defaultLang}`);
      
      userLang = (userSettings && userSettings.userLang) || 
                 (userData && userData.settings && userData.settings.userLang) || 
                 meta.config.defaultLang || 'en-US';
      
      winston.info(`[plugin/caiz] Final user ${uid} language: ${userLang}`);
    } catch (err) {
      winston.error(`[plugin/caiz] Failed to get user language, using default: ${userLang}`, err);
    }
    winston.info(`[plugin/caiz] Using language: ${userLang} for subcategory translations`);
    
    await Promise.all(categoriesToCreate.map(async (category) => {
      if (!category || !category.name) {
        winston.warn('[plugin/caiz] Skipping invalid subcategory entry (missing name).', category);
        return null;
      }
      
      // Translate i18n keys to actual text using user's language
      const translatedCategory = { ...category };
      winston.info(`[plugin/caiz] BEFORE translation - name: ${category.name}, desc: ${category.description}`);
      
      if (category.name && category.name.includes('[[') && category.name.includes(']]')) {
        try {
          const translator = require.main.require('./src/translator');
          const translatedName = await translator.translate(category.name, userLang);
          winston.info(`[plugin/caiz] Translation result - original: ${category.name}, translated: ${translatedName}`);
          translatedCategory.name = translatedName;
        } catch (err) {
          winston.error(`[plugin/caiz] Translation failed for name: ${category.name}`, err);
          // Fallback: use English default
          if (category.name.includes('announcements')) {
            translatedCategory.name = 'Announcements';
          } else if (category.name.includes('general')) {
            translatedCategory.name = 'General Discussion';
          } else if (category.name.includes('questions')) {
            translatedCategory.name = 'Questions & Support';
          } else if (category.name.includes('resources')) {
            translatedCategory.name = 'Resources & Information';
          } else {
            // Strip i18n syntax as ultimate fallback
            translatedCategory.name = category.name.replace(/\[\[.*?\]\]/g, '').trim() || 'Category';
          }
        }
      }
      
      if (category.description && category.description.includes('[[') && category.description.includes(']]')) {
        try {
          const translator = require.main.require('./src/translator');
          translatedCategory.description = await translator.translate(category.description, userLang);
        } catch (err) {
          winston.error(`[plugin/caiz] Translation failed for description: ${category.description}`, err);
          // Fallback: use English descriptions
          if (category.description.includes('announcements')) {
            translatedCategory.description = 'Important announcements from the community';
          } else if (category.description.includes('general')) {
            translatedCategory.description = 'A place for members to freely discuss and interact';
          } else if (category.description.includes('questions')) {
            translatedCategory.description = 'Feel free to ask questions or seek advice';
          } else if (category.description.includes('resources')) {
            translatedCategory.description = 'A place to share useful information and resources';
          } else {
            // Strip i18n syntax as ultimate fallback
            translatedCategory.description = category.description.replace(/\[\[.*?\]\]/g, '').trim() || '';
          }
        }
      }
      
      winston.info(`[plugin/caiz] AFTER translation - name: ${translatedCategory.name}, desc: ${translatedCategory.description}`);
      return data.createCategory({ ...translatedCategory, parentCid: cid });
    }));
  }

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
  
  // Filter out null entries (deleted categories) and get only top-level categories
  const communities = categoryData.filter(cat => {
    if (!cat) {
      winston.info(`[plugin/caiz] Skipping null category entry`);
      return false;
    }
    if (!cat.cid) {
      winston.info(`[plugin/caiz] Skipping category with no cid`);
      return false;
    }
    return cat.parentCid === 0;
  });
  
  winston.info(`[plugin/caiz] Filtered to ${communities.length} top-level communities`);
  if (communities.length > 0) {
    winston.info(`[plugin/caiz] Valid communities:`, communities.map(c => ({ 
      cid: c.cid, 
      name: c.name, 
      parentCid: c.parentCid 
    })));
  }
  
  return communities;
}

async function Follow(socket, { cid }) {
  const { uid } = socket;
  if (!uid) throw new Error('Not logged in');
  
  winston.info(`[plugin/caiz] User ${uid} following community ${cid}`);
  
  // Find the parent category to follow
  const targetCid = await getParentCategory(cid);
  
  // Add to followed categories (parent category only)
  await data.sortedSetAdd(`uid:${uid}:followed_cats`, Date.now(), targetCid);
  
  // Check if user is already a member of any community group (use parent category)
  const memberGroups = [
    await data.getObjectField(`category:${targetCid}`, 'ownerGroup'),
    getGroupName(targetCid, GROUP_SUFFIXES.MANAGERS),
    getGroupName(targetCid, GROUP_SUFFIXES.MEMBERS),
    getGroupName(targetCid, GROUP_SUFFIXES.BANNED)
  ];
  
  let isAlreadyMember = false;
  for (const groupName of memberGroups) {
    if (groupName && await data.groupExists(groupName) && await data.isMemberOfGroup(uid, groupName)) {
      winston.info(`[plugin/caiz] User ${uid} is already member of group ${groupName}`);
      isAlreadyMember = true;
      break;
    }
  }
  
  // If not already a member, add to members group (use parent category)
  if (!isAlreadyMember) {
    const memberGroupName = getGroupName(targetCid, GROUP_SUFFIXES.MEMBERS);
    if (await data.groupExists(memberGroupName)) {
      await data.joinGroup(memberGroupName, uid);
      winston.info(`[plugin/caiz] Added user ${uid} to member group ${memberGroupName}`);
    } else {
      winston.warn(`[plugin/caiz] Member group ${memberGroupName} does not exist for community ${targetCid}`);
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
  
  // Find the parent category
  const targetCid = await getParentCategory(cid);
  
  const isFollowed = await data.sortedSetScore(`uid:${uid}:followed_cats`, targetCid);
  winston.info(`[plugin/caiz] Follow status check - uid: ${uid}, targetCid: ${targetCid}, result: ${isFollowed !== null}`);
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

async function DeleteCommunity(socket, { cid }) {
  const { uid } = socket;
  
  winston.info(`[plugin/caiz] Deleting community cid: ${cid}, uid: ${uid}`);
  
  if (!uid) {
    winston.error(`[plugin/caiz] Authentication required for deletion`);
    throw new Error('Authentication required');
  }
  
  if (!cid) {
    winston.error(`[plugin/caiz] Community ID is required`);
    throw new Error('Community ID is required');
  }
  
  try {
    // Check ownership
    const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
    if (!ownerGroup) {
      winston.error(`[plugin/caiz] No owner group found for community ${cid}`);
      throw new Error('Community not found or not a community');
    }
    
    const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
    if (!isOwner) {
      winston.error(`[plugin/caiz] User ${uid} is not owner of community ${cid}`);
      throw new Error('Permission denied - only owners can delete communities');
    }
    
    // Get category data for logging
    const categoryData = await data.getCategoryData(cid);
    if (!categoryData) {
      winston.error(`[plugin/caiz] Community ${cid} not found`);
      throw new Error('Community not found');
    }
    
    winston.info(`[plugin/caiz] Starting deletion of community "${categoryData.name}" (${cid})`);
    
    // Delete community and all related data
    await deleteCommunityData(cid, uid);
    
    // Log the deletion
    winston.info(`[plugin/caiz] Community "${categoryData.name}" (${cid}) successfully deleted by user ${uid}`);
    
    return { success: true, message: 'Community deleted successfully' };
    
  } catch (error) {
    winston.error(`[plugin/caiz] Error deleting community ${cid}: ${error.message}`);
    throw error;
  }
}

async function deleteCommunityData(cid, uid) {
  winston.info(`[plugin/caiz] Starting comprehensive deletion for community ${cid}`);
  
  try {
    const Categories = require.main.require('./src/categories');
    const Topics = require.main.require('./src/topics');
    const Posts = require.main.require('./src/posts');
    const Groups = require.main.require('./src/groups');
    const db = require.main.require('./src/database');
    
    // 1. Get all subcategories
    const allCategoryData = await Categories.getAllCategoryFields(['cid', 'parentCid']);
    const subcategories = allCategoryData.filter(cat => cat.parentCid == cid);
    
    winston.info(`[plugin/caiz] Found ${subcategories.length} subcategories to delete`);
    
    // 2. Delete all topics and posts in subcategories first
    for (const subcat of subcategories) {
      await deleteTopicsAndPosts(subcat.cid, uid);
      await Categories.purge(subcat.cid, uid);
    }
    
    // 3. Delete all topics and posts in main category
    await deleteTopicsAndPosts(cid, uid);
    
    // 4. Clean up follow data
    await cleanupFollowData(cid);
    
    // 5. Delete community groups
    await deleteCommunityGroups(cid);
    
    // 6. Delete the main category
    await Categories.purge(cid, uid);
    
    winston.info(`[plugin/caiz] Community ${cid} deletion completed successfully`);
    
  } catch (error) {
    winston.error(`[plugin/caiz] Error during community deletion: ${error.message}`);
    throw error;
  }
}

async function deleteTopicsAndPosts(cid, uid) {
  winston.info(`[plugin/caiz] Deleting topics and posts for category ${cid}`);
  
  try {
    const Topics = require.main.require('./src/topics');
    const Posts = require.main.require('./src/posts');
    
    // Get all topics in this category
    const tids = await data.getSortedSetRange(`cid:${cid}:tids`, 0, -1);
    
    winston.info(`[plugin/caiz] Found ${tids.length} topics to delete in category ${cid}`);
    
    // Delete each topic and its posts
    for (const tid of tids) {
      try {
        await Topics.purge(tid, uid);
        winston.debug(`[plugin/caiz] Deleted topic ${tid}`);
      } catch (err) {
        winston.warn(`[plugin/caiz] Failed to delete topic ${tid}: ${err.message}`);
      }
    }
    
    winston.info(`[plugin/caiz] Completed deletion of topics and posts for category ${cid}`);
    
  } catch (error) {
    winston.error(`[plugin/caiz] Error deleting topics and posts: ${error.message}`);
    throw error;
  }
}

async function cleanupFollowData(cid) {
  winston.info(`[plugin/caiz] Cleaning up follow data for community ${cid}`);
  
  try {
    const db = require.main.require('./src/database');
    const user = require.main.require('./src/user');
    
    // Get all users to check their followed_cats
    const allUids = await user.getUidsFromSet('users:joindate', 0, -1);
    
    winston.info(`[plugin/caiz] Checking ${allUids.length} users for followed_cats cleanup`);
    
    // Remove community from each user's followed list
    let cleanedCount = 0;
    for (const uid of allUids) {
      try {
        const removed = await data.sortedSetRemove(`uid:${uid}:followed_cats`, cid);
        if (removed) {
          cleanedCount++;
          winston.debug(`[plugin/caiz] Removed community ${cid} from user ${uid} followed list`);
        }
      } catch (err) {
        winston.warn(`[plugin/caiz] Failed to clean up follow data for user ${uid}: ${err.message}`);
      }
    }
    
    winston.info(`[plugin/caiz] Cleaned up follow data for ${cleanedCount} users`);
    
    winston.info(`[plugin/caiz] Completed cleanup of follow data for community ${cid}`);
    
  } catch (error) {
    winston.error(`[plugin/caiz] Error cleaning up follow data: ${error.message}`);
    throw error;
  }
}

async function deleteCommunityGroups(cid) {
  winston.info(`[plugin/caiz] Deleting community groups for ${cid}`);
  
  try {
    const Groups = require.main.require('./src/groups');
    
    // Get owner group name first
    const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
    
    const groupsToDelete = [
      ownerGroup,
      getGroupName(cid, GROUP_SUFFIXES.MANAGERS),
      getGroupName(cid, GROUP_SUFFIXES.MEMBERS),
      getGroupName(cid, GROUP_SUFFIXES.BANNED)
    ].filter(Boolean); // Remove null/undefined values
    
    winston.info(`[plugin/caiz] Deleting ${groupsToDelete.length} groups: ${groupsToDelete.join(', ')}`);
    
    // Delete each group
    for (const groupName of groupsToDelete) {
      try {
        const exists = await Groups.exists(groupName);
        if (exists) {
          await Groups.destroy(groupName);
          winston.debug(`[plugin/caiz] Deleted group: ${groupName}`);
        } else {
          winston.warn(`[plugin/caiz] Group ${groupName} does not exist, skipping`);
        }
      } catch (err) {
        winston.warn(`[plugin/caiz] Failed to delete group ${groupName}: ${err.message}`);
      }
    }
    
    winston.info(`[plugin/caiz] Completed deletion of community groups for ${cid}`);
    
  } catch (error) {
    winston.error(`[plugin/caiz] Error deleting community groups: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createCommunity,
  getUserCommunities,
  Follow,
  Unfollow,
  IsFollowed,
  GetCommunityData,
  UpdateCommunityData,
  DeleteCommunity
};