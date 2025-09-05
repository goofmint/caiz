'use strict';

const db = require.main.require('./src/database');
const groups = require.main.require('./src/groups');
const privileges = require.main.require('./src/privileges');

const xConfig = {};

xConfig.getConfig = async (cid) => {
  const key = `x-notification:community:${cid}`;
  const config = await db.getObject(key);
  
  if (!config) {
    return {
      enabled: false,
      accounts: [],
      selectedAccountId: null,
      events: {
        newTopic: false,
        newPost: false,
        memberJoin: false,
        memberLeave: false
      },
      templates: {
        newTopic: '🆕 New topic in {community}: {title}\n{url}',
        newPost: '💬 New post in {community}: {title}\n{url}',
        memberJoin: '👋 {username} joined {community}',
        memberLeave: '👋 {username} left {community}'
      }
    };
  }
  
  // Parse JSON fields
  if (config.accounts && typeof config.accounts === 'string') {
    config.accounts = JSON.parse(config.accounts);
  }
  if (config.events && typeof config.events === 'string') {
    config.events = JSON.parse(config.events);
  }
  if (config.templates && typeof config.templates === 'string') {
    config.templates = JSON.parse(config.templates);
  }
  
  return config;
};

xConfig.updateConfig = async (cid, updates) => {
  const key = `x-notification:community:${cid}`;
  const current = await xConfig.getConfig(cid);
  
  const newConfig = {
    ...current,
    ...updates,
    enabled: updates.selectedAccountId ? true : false
  };
  
  // Stringify complex objects
  await db.setObject(key, {
    ...newConfig,
    accounts: JSON.stringify(newConfig.accounts || []),
    events: JSON.stringify(newConfig.events || {}),
    templates: JSON.stringify(newConfig.templates || {})
  });
};

xConfig.addAccount = async (cid, accountData) => {
  const config = await xConfig.getConfig(cid);
  
  // Check if account already exists
  const existingIndex = config.accounts.findIndex(a => a.accountId === accountData.accountId);
  
  if (existingIndex >= 0) {
    // Update existing account
    config.accounts[existingIndex] = {
      ...config.accounts[existingIndex],
      ...accountData
    };
  } else {
    // Add new account
    config.accounts.push(accountData);
  }
  
  // If this is the first account, make it default
  if (!config.selectedAccountId) {
    config.selectedAccountId = accountData.accountId;
  }
  
  await xConfig.updateConfig(cid, config);
};

xConfig.removeAccount = async (cid, accountId) => {
  const config = await xConfig.getConfig(cid);
  
  config.accounts = config.accounts.filter(a => a.accountId !== accountId);
  
  // If removed account was selected, clear selection
  if (config.selectedAccountId === accountId) {
    config.selectedAccountId = config.accounts.length > 0 ? config.accounts[0].accountId : null;
  }
  
  await xConfig.updateConfig(cid, config);
};

xConfig.getAccount = async (cid, accountId) => {
  const config = await xConfig.getConfig(cid);
  return config.accounts.find(a => a.accountId === accountId);
};

xConfig.getSelectedAccount = async (cid) => {
  const config = await xConfig.getConfig(cid);
  if (!config.selectedAccountId) {
    return null;
  }
  return config.accounts.find(a => a.accountId === config.selectedAccountId);
};

xConfig.isCommunityOwner = async (cid, uid) => {
  // Check if user is an admin first
  const isAdmin = await privileges.admin.can('admin:settings', uid);
  if (isAdmin) {
    return true;
  }
  
  // Check if user is in the community owner group
  const ownerGroupName = `cid:${cid}:privileges:groups:owner`;
  return await groups.isMember(uid, ownerGroupName);
};

xConfig.getCommunityFromCategory = async (cid) => {
  const categories = require.main.require('./src/categories');
  const category = await categories.getCategoryData(cid);
  
  if (!category) {
    return null;
  }
  
  // Walk up the category tree to find the community (top-level category)
  let current = category;
  while (current.parentCid && current.parentCid !== 0) {
    current = await categories.getCategoryData(current.parentCid);
  }
  
  return current;
};

module.exports = xConfig;