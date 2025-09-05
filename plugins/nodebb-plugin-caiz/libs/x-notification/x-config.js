'use strict';

const db = require.main.require('./src/database');
const groups = require.main.require('./src/groups');
const privileges = require.main.require('./src/privileges');

const xConfig = {};

xConfig.getConfig = async (cid) => {
  const meta = require.main.require('./src/meta');
  const settingsPrefix = `x-notification:${cid}:`;
  
  const config = {
    enabled: await meta.settings.getOne('caiz', `${settingsPrefix}enabled`) === 'true',
    selectedAccountId: await meta.settings.getOne('caiz', `${settingsPrefix}selectedAccountId`),
    accounts: [],
    events: {
      newTopic: await meta.settings.getOne('caiz', `${settingsPrefix}events:newTopic`) === 'true',
      newPost: await meta.settings.getOne('caiz', `${settingsPrefix}events:newPost`) === 'true',
      memberJoin: await meta.settings.getOne('caiz', `${settingsPrefix}events:memberJoin`) === 'true',
      memberLeave: await meta.settings.getOne('caiz', `${settingsPrefix}events:memberLeave`) === 'true'
    },
    templates: {
      newTopic: await meta.settings.getOne('caiz', `${settingsPrefix}templates:newTopic`),
      newPost: await meta.settings.getOne('caiz', `${settingsPrefix}templates:newPost`),
      memberJoin: await meta.settings.getOne('caiz', `${settingsPrefix}templates:memberJoin`),
      memberLeave: await meta.settings.getOne('caiz', `${settingsPrefix}templates:memberLeave`)
    }
  };
  
  // Load accounts from database
  const accountsJson = await db.getObjectField(`x-notification:community:${cid}`, 'accounts');
  if (accountsJson) {
    config.accounts = JSON.parse(accountsJson);
  }
  
  return config;
};

xConfig.updateConfig = async (cid, updates) => {
  const meta = require.main.require('./src/meta');
  const settingsPrefix = `x-notification:${cid}:`;
  
  // Update individual settings
  if (updates.enabled !== undefined) {
    await meta.settings.setOne('caiz', `${settingsPrefix}enabled`, updates.enabled.toString());
  }
  if (updates.selectedAccountId !== undefined) {
    await meta.settings.setOne('caiz', `${settingsPrefix}selectedAccountId`, updates.selectedAccountId);
  }
  
  // Update events
  if (updates.events) {
    for (const [key, value] of Object.entries(updates.events)) {
      await meta.settings.setOne('caiz', `${settingsPrefix}events:${key}`, value.toString());
    }
  }
  
  // Update templates
  if (updates.templates) {
    for (const [key, value] of Object.entries(updates.templates)) {
      await meta.settings.setOne('caiz', `${settingsPrefix}templates:${key}`, value);
    }
  }
  
  // Update accounts in database
  if (updates.accounts !== undefined) {
    await db.setObjectField(`x-notification:community:${cid}`, 'accounts', JSON.stringify(updates.accounts));
  }
};

xConfig.addAccount = async (cid, accountData) => {
  console.log('[x-config] Adding account for community:', cid);
  const config = await xConfig.getConfig(cid);
  console.log('[x-config] Current config accounts count:', config.accounts.length);
  
  // Check if account already exists
  const existingIndex = config.accounts.findIndex(a => a.accountId === accountData.accountId);
  
  if (existingIndex >= 0) {
    console.log('[x-config] Updating existing account at index:', existingIndex);
    // Update existing account
    config.accounts[existingIndex] = {
      ...config.accounts[existingIndex],
      ...accountData
    };
  } else {
    console.log('[x-config] Adding new account');
    // Add new account
    config.accounts.push(accountData);
  }
  
  // If this is the first account, make it default
  if (!config.selectedAccountId) {
    console.log('[x-config] Setting as default account:', accountData.accountId);
    config.selectedAccountId = accountData.accountId;
  }
  
  console.log('[x-config] Final accounts count:', config.accounts.length);
  console.log('[x-config] Selected account ID:', config.selectedAccountId);
  
  await xConfig.updateConfig(cid, config);
  console.log('[x-config] Account saved to database');
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