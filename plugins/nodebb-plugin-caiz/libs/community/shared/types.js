// Type definitions for community module
// Note: This file is for documentation purposes in JavaScript
// If migrating to TypeScript, these would be actual type definitions

/**
 * @typedef {Object} Community
 * @property {number} cid - Community ID
 * @property {string} name - Community name
 * @property {string} description - Community description
 * @property {string} [backgroundImage] - Background image URL
 * @property {string} [icon] - Icon class
 * @property {string} [color] - Icon color
 * @property {string} [bgColor] - Background color
 * @property {string} ownerGroup - Owner group name
 */

/**
 * @typedef {Object} Member
 * @property {number} uid - User ID
 * @property {string} username - Username
 * @property {string} userslug - User slug
 * @property {string} [picture] - User picture URL
 * @property {string} role - Member role (owner, manager, member, banned)
 * @property {number} joindate - Join date timestamp
 * @property {number} lastonline - Last online timestamp
 * @property {string} [status] - User status
 */

/**
 * @typedef {Object} Subcategory
 * @property {number} cid - Category ID
 * @property {string} name - Category name
 * @property {string} description - Category description
 * @property {number} parentCid - Parent category ID
 * @property {string} [icon] - Icon class
 * @property {string} [color] - Icon color
 * @property {string} [bgColor] - Background color
 * @property {number} order - Display order
 * @property {number} postcount - Number of posts
 * @property {number} topiccount - Number of topics
 */

/**
 * @typedef {'owner'|'manager'|'member'|'banned'} Role
 */

/**
 * @typedef {Object} SocketData
 * @property {number} uid - User ID from socket
 */

module.exports = {};