const winston = require.main.require('winston');
const Categories = require.main.require('./src/categories');
const data = require('./data');
const { GROUP_SUFFIXES, getGroupName } = require('./shared/constants');

/**
 * Permission checks and group management
 */

async function IsCommunityOwner(socket, { cid }) {
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

    const ownerGroup = category.ownerGroup;
    if (!ownerGroup) {
      winston.info(`[plugin/caiz] No owner group found for category ${cid}`);
      return { isOwner: false };
    }

    // Check if user is in owner group
    const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
    winston.info(`[plugin/caiz] User ${uid} owner status for category ${cid}: ${isOwner}`);
    
    return { isOwner };
  } catch (err) {
    winston.error(`[plugin/caiz] Error checking community owner: ${err.message}`);
    return { isOwner: false };
  }
}

async function createCommunityGroup(name, description, ownerUid, privateFlag = 0, hidden = 0) {
  const group = await data.getGroupData(name);
  if (group) {
    winston.info(`[plugin/caiz] Group ${name} already exists`);
    return group;
  }
  winston.info(`[plugin/caiz] Creating new group ${name}`);
  // Don't set ownerUid for all groups - only add members explicitly
  return data.createGroup({
    name,
    description,
    private: privateFlag,
    hidden
  });
}

async function checkOwnership(uid, cid) {
  if (!uid || !cid) {
    return false;
  }
  
  const category = await Categories.getCategoryData(cid);
  const ownerGroup = category?.ownerGroup;
  if (!ownerGroup) {
    return false;
  }
  
  return data.isMemberOfGroup(uid, ownerGroup);
}

async function checkManagerPermission(uid, cid) {
  if (!uid || !cid) {
    return false;
  }
  
  // Check if user is owner first
  const isOwner = await checkOwnership(uid, cid);
  if (isOwner) {
    return true;
  }
  
  // Check if user is manager
  const managerGroup = getGroupName(cid, GROUP_SUFFIXES.MANAGERS);
  return data.isMemberOfGroup(uid, managerGroup);
}

/**
 * ユーザーがコミュニティメンバーかチェック
 * @param {number} uid - ユーザーID
 * @param {number} cid - カテゴリID
 * @returns {Promise<boolean>} メンバーである場合true
 */
async function isCommunityMember(uid, cid) {
  if (!uid || !cid) {
    return false;
  }
  
  try {
    // Get the top-level community category ID
    const category = await Categories.getCategoryData(cid);
    if (!category) {
      return false;
    }
    
    let communityCid = cid;
    if (category.parentCid && category.parentCid !== 0) {
      // This is a subcategory, get the parent community
      const parentCategory = await Categories.getCategoryData(category.parentCid);
      if (parentCategory && parentCategory.parentCid === 0) {
        communityCid = category.parentCid;
      }
    }
    
    // Check if user is banned first
    const bannedGroup = getGroupName(communityCid, GROUP_SUFFIXES.BANNED);
    const isBanned = await data.isMemberOfGroup(uid, bannedGroup);
    if (isBanned) {
      winston.info(`[plugin/caiz] User ${uid} is banned from community ${communityCid}`);
      return false;
    }
    
    // Check owner, manager, or member groups
    const ownerGroup = await data.getObjectField(`category:${communityCid}`, 'ownerGroup');
    const managerGroup = getGroupName(communityCid, GROUP_SUFFIXES.MANAGERS);
    const memberGroup = getGroupName(communityCid, GROUP_SUFFIXES.MEMBERS);
    
    const isOwner = ownerGroup && await data.isMemberOfGroup(uid, ownerGroup);
    const isManager = await data.isMemberOfGroup(uid, managerGroup);
    const isMember = await data.isMemberOfGroup(uid, memberGroup);
    
    const result = isOwner || isManager || isMember;
    winston.info(`[plugin/caiz] User ${uid} community member status for ${communityCid}: ${result}`);
    return result;
  } catch (err) {
    winston.error(`[plugin/caiz] Error checking community membership: ${err.message}`);
    return false;
  }
}

/**
 * ユーザーが投稿権限を持つかチェック
 * @param {number} uid - ユーザーID
 * @param {number} cid - カテゴリID
 * @returns {Promise<boolean>} 投稿権限がある場合true
 */
async function canPost(uid, cid) {
  if (!uid) {
    winston.info(`[plugin/caiz] User not logged in, cannot post to ${cid}`);
    return false;
  }
  
  try {
    // Check if user is a community member
    const isMember = await isCommunityMember(uid, cid);
    winston.info(`[plugin/caiz] User ${uid} post permission for ${cid}: ${isMember}`);
    return isMember;
  } catch (err) {
    winston.error(`[plugin/caiz] Error checking post permission: ${err.message}`);
    return false;
  }
}

module.exports = {
  IsCommunityOwner,
  createCommunityGroup,
  checkOwnership,
  checkManagerPermission,
  isCommunityMember,
  canPost
};