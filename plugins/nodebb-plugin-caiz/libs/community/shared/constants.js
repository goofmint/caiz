const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  MEMBER: 'member',
  BANNED: 'banned'
};

const ROLE_ORDER = {
  [ROLES.OWNER]: 0,
  [ROLES.MANAGER]: 1,
  [ROLES.MEMBER]: 2,
  [ROLES.BANNED]: 3
};

const GROUP_SUFFIXES = {
  OWNERS: 'owners',
  MANAGERS: 'managers',
  MEMBERS: 'members',
  BANNED: 'banned'
};

const getGroupName = (cid, suffix) => `community-${cid}-${suffix}`;

const GUEST_PRIVILEGES = ['groups:find', 'groups:read', 'groups:topics:read'];

module.exports = {
  ROLES,
  ROLE_ORDER,
  GROUP_SUFFIXES,
  getGroupName,
  GUEST_PRIVILEGES
};