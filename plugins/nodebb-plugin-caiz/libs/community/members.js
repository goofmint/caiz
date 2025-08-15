const winston = require.main.require('winston');
const data = require('./data');
const { ROLES, ROLE_ORDER, GROUP_SUFFIXES, getGroupName } = require('./shared/constants');

async function GetMembers(socket, { cid }) {
  winston.info(`[plugin/caiz] Getting members for cid: ${cid}, uid: ${socket.uid}`);
  
  const { uid } = socket;
  if (!uid) {
    throw new Error('Authentication required');
  }
  
  // Check if user has permission to view members (owner or manager)
  const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
  if (!ownerGroup) {
    winston.error(`[plugin/caiz] No owner group found for cid: ${cid}`);
    throw new Error('Community configuration error');
  }
  
  const managerGroup = getGroupName(cid, GROUP_SUFFIXES.MANAGERS);
  
  const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
  const isManager = await data.isMemberOfGroup(uid, managerGroup);
  
  winston.info(`[plugin/caiz] User ${uid} isOwner: ${isOwner}, isManager: ${isManager}, ownerGroup: ${ownerGroup}, managerGroup: ${managerGroup}`);
  
  if (!isOwner && !isManager) {
    winston.info(`[plugin/caiz] User ${uid} does not have permission to view members`);
    throw new Error('Permission denied');
  }
  
  try {
    const memberMap = new Map(); // Use Map to track unique users
    const groups = [
      { name: ownerGroup, role: ROLES.OWNER },
      { name: managerGroup, role: ROLES.MANAGER },
      { name: getGroupName(cid, GROUP_SUFFIXES.MEMBERS), role: ROLES.MEMBER },
      { name: getGroupName(cid, GROUP_SUFFIXES.BANNED), role: ROLES.BANNED }
    ];
    
    // Process groups in priority order - first role found wins
    for (const group of groups) {
      const groupExists = await data.groupExists(group.name);
      if (!groupExists) {
        winston.info(`[plugin/caiz] Group ${group.name} does not exist, skipping`);
        continue;
      }
      
      const memberUids = await data.getGroupMembers(group.name);
      winston.info(`[plugin/caiz] Found ${memberUids.length} members in group ${group.name}`);
      
      if (memberUids.length > 0) {
        const userData = await data.getUsersFields(memberUids, [
          'uid', 'username', 'userslug', 'picture', 'joindate', 'lastonline', 'status'
        ]);
        
        userData.forEach(user => {
          if (user && user.uid) {
            // Only add user if not already in the map (first role wins)
            if (!memberMap.has(user.uid)) {
              winston.info(`[plugin/caiz] Adding user ${user.uid} (${user.username}) with role ${group.role} to members list`);
              memberMap.set(user.uid, {
                ...user,
                role: group.role,
                joindate: parseInt(user.joindate) || Date.now(),
                lastonline: parseInt(user.lastonline) || Date.now()
              });
            } else {
              winston.info(`[plugin/caiz] User ${user.uid} already in list with role ${memberMap.get(user.uid).role}, skipping ${group.role}`);
            }
          }
        });
      }
    }
    
    // Convert Map to array
    const members = Array.from(memberMap.values());
    
    // Sort by role priority, then by username
    members.sort((a, b) => {
      if (ROLE_ORDER[a.role] !== ROLE_ORDER[b.role]) {
        return ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
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

async function AddMember(socket, { cid, username, role }) {
  winston.info(`[plugin/caiz] Adding member ${username} with role ${role} to cid: ${cid}, uid: ${socket.uid}`);
  
  const { uid } = socket;
  if (!uid || !username || !role) {
    throw new Error('Authentication, username, and role required');
  }
  
  // Check permissions (owner or manager can add members)
  const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
  const managerGroup = getGroupName(cid, GROUP_SUFFIXES.MANAGERS);
  
  const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
  const isManager = await data.isMemberOfGroup(uid, managerGroup);
  
  if (!isOwner && !isManager) {
    throw new Error('Permission denied');
  }
  
  try {
    // Get user data
    const targetUid = await data.getUidByUsername(username);
    
    if (!targetUid) {
      throw new Error('User not found');
    }
    
    // Check if user is already a member in any role
    const memberGroups = [
      ownerGroup,
      managerGroup,
      getGroupName(cid, GROUP_SUFFIXES.MEMBERS),
      getGroupName(cid, GROUP_SUFFIXES.BANNED)
    ];
    
    for (const groupName of memberGroups) {
      const groupExists = await data.groupExists(groupName);
      if (groupExists && await data.isMemberOfGroup(targetUid, groupName)) {
        throw new Error('User is already a member of this community');
      }
    }
    
    // Get additional user data
    const userData = await data.getUserFields(targetUid, ['username', 'userslug', 'picture', 'lastonline', 'status']);
    
    // Add user to appropriate group based on role
    let targetGroupName;
    switch (role) {
      case 'owner':
        targetGroupName = ownerGroup;
        break;
      case 'manager':
        targetGroupName = managerGroup;
        break;
      case 'member':
        targetGroupName = getGroupName(cid, GROUP_SUFFIXES.MEMBERS);
        break;
      default:
        throw new Error(`Invalid role: ${role}`);
    }
    
    await data.joinGroup(targetGroupName, targetUid);
    
    winston.info(`[plugin/caiz] User ${username} added to community ${cid} with role ${role} (group: ${targetGroupName})`);
    
    return {
      success: true,
      user: {
        uid: targetUid,
        username: userData.username,
        userslug: userData.userslug,
        picture: userData.picture,
        role: ROLES.MEMBER,
        joindate: Date.now(),
        lastonline: userData.lastonline || Date.now(),
        status: userData.status || 'online'
      }
    };
    
  } catch (error) {
    winston.error(`[plugin/caiz] Error adding member:`, error);
    throw error;
  }
}

async function ChangeMemberRole(socket, { cid, targetUid, newRole }) {
  winston.info(`[plugin/caiz] Changing role for uid ${targetUid} to ${newRole} in cid: ${cid}, by uid: ${socket.uid}`);
  
  const { uid } = socket;
  if (!uid || !targetUid || !newRole) {
    throw new Error('Authentication, target user, and new role required');
  }
  
  const validRoles = Object.values(ROLES);
  if (!validRoles.includes(newRole)) {
    throw new Error('Invalid role');
  }
  
  // Check permissions
  const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
  const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
  
  // Only owners can change roles to/from owner or banned
  if ((newRole === ROLES.OWNER || newRole === ROLES.BANNED) && !isOwner) {
    throw new Error('Permission denied - only owners can assign owner or banned roles');
  }
  
  // Check if trying to change owner role when they are the last owner
  const isTargetOwner = await data.isMemberOfGroup(targetUid, ownerGroup);
  if (isTargetOwner && newRole !== ROLES.OWNER) {
    const ownerMembers = await data.getGroupMembers(ownerGroup);
    if (ownerMembers.length <= 1) {
      throw new Error('Cannot change role of the last owner of the community');
    }
  }
  
  // Check if user is trying to change their own role inappropriately
  if (uid === targetUid) {
    // Non-owners cannot promote themselves
    if (!isTargetOwner && (newRole === ROLES.OWNER || newRole === ROLES.MANAGER)) {
      throw new Error('Cannot promote yourself');
    }
  }
  
  try {
    // Remove user from all community groups
    const allGroups = [
      ownerGroup,
      getGroupName(cid, GROUP_SUFFIXES.MANAGERS),
      getGroupName(cid, GROUP_SUFFIXES.MEMBERS),
      getGroupName(cid, GROUP_SUFFIXES.BANNED)
    ];
    
    for (const groupName of allGroups) {
      const groupExists = await data.groupExists(groupName);
      if (groupExists) {
        await data.leaveGroup(groupName, targetUid);
      }
    }
    
    // Add user to appropriate group based on new role
    let targetGroup;
    switch (newRole) {
      case ROLES.OWNER:
        targetGroup = ownerGroup;
        break;
      case ROLES.MANAGER:
        targetGroup = getGroupName(cid, GROUP_SUFFIXES.MANAGERS);
        break;
      case ROLES.MEMBER:
        targetGroup = getGroupName(cid, GROUP_SUFFIXES.MEMBERS);
        break;
      case ROLES.BANNED:
        targetGroup = getGroupName(cid, GROUP_SUFFIXES.BANNED);
        break;
    }
    
    await data.joinGroup(targetGroup, targetUid);
    
    winston.info(`[plugin/caiz] User ${targetUid} role changed to ${newRole} in community ${cid}`);
    
    return { success: true };
    
  } catch (error) {
    winston.error(`[plugin/caiz] Error changing member role:`, error);
    throw error;
  }
}

async function RemoveMember(socket, { cid, targetUid }) {
  winston.info(`[plugin/caiz] Removing member uid ${targetUid} from cid: ${cid}, by uid: ${socket.uid}`);
  
  const { uid } = socket;
  if (!uid || !targetUid) {
    throw new Error('Authentication and target user required');
  }
  
  // Check permissions (owner or manager)
  const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
  const managerGroup = getGroupName(cid, GROUP_SUFFIXES.MANAGERS);
  
  const isOwner = await data.isMemberOfGroup(uid, ownerGroup);
  const isManager = await data.isMemberOfGroup(uid, managerGroup);
  
  if (!isOwner && !isManager) {
    throw new Error('Permission denied');
  }
  
  // Check if trying to remove an owner (only owners can remove owners)
  const targetIsOwner = await data.isMemberOfGroup(targetUid, ownerGroup);
  if (targetIsOwner && !isOwner) {
    throw new Error('Permission denied - only owners can remove owners');
  }
  
  // Prevent removing the last owner
  if (targetIsOwner) {
    const ownerMembers = await data.getGroupMembers(ownerGroup);
    if (ownerMembers.length <= 1) {
      throw new Error('Cannot remove the last owner of the community');
    }
  }
  
  try {
    // Remove user from all community groups
    const allGroups = [
      ownerGroup,
      getGroupName(cid, GROUP_SUFFIXES.MANAGERS),
      getGroupName(cid, GROUP_SUFFIXES.MEMBERS),
      getGroupName(cid, GROUP_SUFFIXES.BANNED)
    ];
    
    for (const groupName of allGroups) {
      const groupExists = await data.groupExists(groupName);
      if (groupExists) {
        await data.leaveGroup(groupName, targetUid);
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
async function getUserRole(uid, cid) {
  const ownerGroup = await data.getObjectField(`category:${cid}`, 'ownerGroup');
  
  if (await data.isMemberOfGroup(uid, ownerGroup)) return ROLES.OWNER;
  if (await data.isMemberOfGroup(uid, getGroupName(cid, GROUP_SUFFIXES.MANAGERS))) return ROLES.MANAGER;
  if (await data.isMemberOfGroup(uid, getGroupName(cid, GROUP_SUFFIXES.MEMBERS))) return ROLES.MEMBER;
  if (await data.isMemberOfGroup(uid, getGroupName(cid, GROUP_SUFFIXES.BANNED))) return ROLES.BANNED;
  
  return null; // Not a member
}

module.exports = {
  GetMembers,
  AddMember,
  ChangeMemberRole,
  RemoveMember,
  getUserRole
};