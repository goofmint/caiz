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
  const req = dataInput.req;
  let locale = null;
  try {
    const displayI18n = require('../community-i18n-display');
    locale = await displayI18n.resolveLocale(req);
  } catch {}

  for (const category of categories) {
    // Link shaping
    category.link = `/${category.handle}`;

    // i18n for top-level communities only (do not touch children here)
    if (locale) {
      try {
        const displayI18n = require('../community-i18n-display');
        const t = await displayI18n.getCategoryDisplayText(category.cid, locale);
        if (t.name) category.name = t.name; // fallback to existing if missing
        if (t.description) category.description = t.description;
      } catch {}
    }

    if (!category.children) continue;
    category.children.forEach(child => {
      child.link = `/${category.handle}/${child.cid}-${child.handle}`;
    });
  }
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
