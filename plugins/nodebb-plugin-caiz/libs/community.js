const plugin = {};
const winston = require.main.require('winston');
const Base = require('./base');
const community = require('./community/index');
const helpers = require('./community/helpers');

/**
 * Main entry point and router for community module
 * Delegates all functionality to submodules
 */

class Community extends Base {
  // HTTP Request Handler
  static async Index(req, res, next) {
    try {
      const cid = await helpers.getCommunity(req.params);
      if (!cid) return next();
      req.params.category_id = cid;
      req.params.slug = `${cid}/${req.params.handle}`;
      Community.controllers.category.get(req, res, next);
    } catch (err) {
      console.error('Error loading category by slug:', err);
      return next(err);
    }
  }

  // WebSocket Handlers - Create
  static async Create(socket, data) {
    const { name, description } = data;
    winston.info(`[plugin/caiz] Creating community: ${name}`);
    const { uid } = socket;
    if (!uid) {
      throw new Error('Not logged in');
    }
    if (!name || name.length < 3) {
      throw new Error('Community name is too short');
    }
    try {
      const newCommunity = await community.createCommunity(uid, { name, description });
      return {
        message: 'Community created successfully!',
        community: newCommunity,
      };
    } catch (err) {
      winston.error(`[plugin/caiz] Error creating community: ${err.message}`);
      throw err;
    }
  }

  // WebSocket Handlers - User Communities
  static async User(socket, data) {
    winston.info('[plugin/caiz] User socket method called');
    const { uid } = socket;
    winston.info(`[plugin/caiz] Socket uid: ${uid}`);
    if (!uid) {
      winston.error('[plugin/caiz] No uid in socket, user not logged in');
      throw new Error('Not logged in');
    }
    const communities = await community.getUserCommunities(uid);
    winston.info(`[plugin/caiz] Returning ${communities.length} communities to client`);
    return communities;
  }

  // Delegate all other WebSocket handlers to community module
  static async Follow(socket, data) {
    return community.Follow(socket, data);
  }

  static async Unfollow(socket, data) {
    return community.Unfollow(socket, data);
  }

  static async GetMemberRole(socket, data) {
    return community.GetMemberRole(socket, data);
  }

  static async IsCommunityOwner(socket, data) {
    return community.IsCommunityOwner(socket, data);
  }

  static async GetCommunityData(socket, data) {
    return community.GetCommunityData(socket, data);
  }

  static async UpdateCommunityData(socket, data) {
    return community.UpdateCommunityData(socket, data);
  }

  static async GetSubCategories(socket, data) {
    return community.GetSubCategories(socket, data);
  }

  static async CreateSubCategory(socket, data) {
    return community.CreateSubCategory(socket, data);
  }

  static async UpdateSubCategory(socket, data) {
    return community.UpdateSubCategory(socket, data);
  }

  static async DeleteSubCategory(socket, data) {
    return community.DeleteSubCategory(socket, data);
  }

  static async ReorderSubCategories(socket, data) {
    return community.ReorderSubCategories(socket, data);
  }

  static async GetMembers(socket, data) {
    return community.GetMembers(socket, data);
  }

  static async AddMember(socket, data) {
    return community.AddMember(socket, data);
  }

  static async ChangeMemberRole(socket, data) {
    return community.ChangeMemberRole(socket, data);
  }

  static async RemoveMember(socket, data) {
    return community.RemoveMember(socket, data);
  }

  static async DeleteCommunity(socket, data) {
    return community.DeleteCommunity(socket, data);
  }

  // Expose helper methods for external use
  static async customizeIndexLink(data) {
    return community.customizeIndexLink(data);
  }

  static async createCommunityLink(data) {
    return community.createCommunityLink(data);
  }

  // Expose internal methods that might be used elsewhere
  static async createCommunity(uid, data) {
    return community.createCommunity(uid, data);
  }

  static async getUserCommunities(uid) {
    return community.getUserCommunities(uid);
  }

  static async createCommunityGroup(name, description, ownerUid, privateFlag, hidden) {
    return community.createCommunityGroup(name, description, ownerUid, privateFlag, hidden);
  }

  // Filter method for topics build
  static async filterTopicsBuild(hookData) {
    return community.filterTopicsBuild(hookData);
  }
}

module.exports = Community;