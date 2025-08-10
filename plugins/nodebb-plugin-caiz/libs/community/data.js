const db = require.main.require('./src/database');
const Categories = require.main.require('./src/categories');
const Groups = require.main.require('./src/groups');
const Users = require.main.require('./src/user');

/**
 * Database access layer for community module
 * Provides thin wrappers around database operations to prevent circular dependencies
 */

const data = {
  // Category operations
  async getCategoryData(cid) {
    return Categories.getCategoryData(cid);
  },

  async getCategoriesData(cids) {
    return Categories.getCategoriesData(cids);
  },

  async createCategory(categoryData) {
    return Categories.create(categoryData);
  },

  async updateCategory(modifiedData) {
    return Categories.update(modifiedData);
  },

  async purgeCategory(cid, uid) {
    return Categories.purge(cid, uid);
  },

  async getCidByHandle(handle) {
    return Categories.getCidByHandle(handle);
  },

  // Group operations
  async getGroupData(name) {
    return Groups.getGroupData(name);
  },

  async createGroup(groupData) {
    return Groups.create(groupData);
  },

  async joinGroup(groupName, uid) {
    return Groups.join(groupName, uid);
  },

  async leaveGroup(groupName, uid) {
    return Groups.leave(groupName, uid);
  },

  async isMemberOfGroup(uid, groupName) {
    return Groups.isMember(uid, groupName);
  },

  async groupExists(groupName) {
    return Groups.exists(groupName);
  },

  async getGroupMembers(groupName) {
    return db.getSortedSetRange(`group:${groupName}:members`, 0, -1);
  },

  // User operations
  async getUserData(uid) {
    return Users.getUserData(uid);
  },

  async getUsersFields(uids, fields) {
    return Users.getUsersFields(uids, fields);
  },

  async getUserFields(uid, fields) {
    return Users.getUserFields(uid, fields);
  },

  async getUidByUsername(username) {
    return Users.getUidByUsername(username);
  },

  // Direct database operations
  async setObjectField(key, field, value) {
    return db.setObjectField(key, field, value);
  },

  async getObjectField(key, field) {
    return db.getObjectField(key, field);
  },

  async sortedSetAdd(key, score, value) {
    return db.sortedSetAdd(key, score, value);
  },

  async sortedSetRemove(key, value) {
    return db.sortedSetRemove(key, value);
  },

  async sortedSetScore(key, value) {
    return db.sortedSetScore(key, value);
  },

  async getSortedSetRange(key, start, stop) {
    return db.getSortedSetRange(key, start, stop);
  },

  async sortedSetCard(key) {
    return db.sortedSetCard(key);
  }
};

module.exports = data;