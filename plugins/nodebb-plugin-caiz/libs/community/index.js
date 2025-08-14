/**
 * Community module public API
 * Re-exports all public functions from submodules to avoid deep import paths
 */

const core = require('./core');
const members = require('./members');
const categories = require('./categories');
const permissions = require('./permissions');
const helpers = require('./helpers');

module.exports = {
  // Core operations
  createCommunity: core.createCommunity,
  getUserCommunities: core.getUserCommunities,
  Follow: core.Follow,
  Unfollow: core.Unfollow,
  IsFollowed: core.IsFollowed,
  GetCommunityData: core.GetCommunityData,
  UpdateCommunityData: core.UpdateCommunityData,
  DeleteCommunity: core.DeleteCommunity,
  
  // Member operations
  GetMembers: members.GetMembers,
  AddMember: members.AddMember,
  ChangeMemberRole: members.ChangeMemberRole,
  RemoveMember: members.RemoveMember,
  getUserRole: members.getUserRole,
  
  // Category operations
  GetSubCategories: categories.GetSubCategories,
  CreateSubCategory: categories.CreateSubCategory,
  UpdateSubCategory: categories.UpdateSubCategory,
  DeleteSubCategory: categories.DeleteSubCategory,
  ReorderSubCategories: categories.ReorderSubCategories,
  
  // Permission operations
  IsCommunityOwner: permissions.IsCommunityOwner,
  createCommunityGroup: permissions.createCommunityGroup,
  checkOwnership: permissions.checkOwnership,
  checkManagerPermission: permissions.checkManagerPermission,
  
  // Helper operations
  getCommunity: helpers.getCommunity,
  customizeIndexLink: helpers.customizeIndexLink,
  createCommunityLink: helpers.createCommunityLink
};