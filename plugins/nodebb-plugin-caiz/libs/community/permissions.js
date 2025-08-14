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



module.exports = {
  IsCommunityOwner,
  createCommunityGroup,
  checkOwnership,
  checkManagerPermission
};