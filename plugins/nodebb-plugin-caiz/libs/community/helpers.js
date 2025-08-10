const data = require('./data');

/**
 * Helper functions and utilities
 */

async function getCommunity(params) {
  const cid = await data.getCidByHandle(params.handle);
  if (!cid) return null;
  return cid;
}

async function customizeIndexLink(dataInput) {
  const { categories } = dataInput.templateData;
  categories.forEach(category => {
    category.link = `/${category.handle}`;
    if (!category.children) return;
    category.children.forEach(child => {
      child.link = `/${category.handle}/${child.cid}-${child.handle}`;
    });
  });
  return dataInput;
}

async function createCommunityLink(dataInput) {
  const { headerLinks } = dataInput.templateData;
  headerLinks.push({
    text: 'Create Community',
    url: '/create-community'
  });
}

module.exports = {
  getCommunity,
  customizeIndexLink,
  createCommunityLink
};