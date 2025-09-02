'use strict';

const displayI18n = require('./community-i18n-display');

async function applyBreadcrumbI18n(breadcrumbs, locale) {
  if (!Array.isArray(breadcrumbs)) return breadcrumbs;
  if (!locale) return breadcrumbs;

  for (const crumb of breadcrumbs) {
    if (!crumb || typeof crumb !== 'object') {
      throw new Error('[[caiz:error.invalid-breadcrumb-item]]');
    }
    if (crumb.cid) {
      const t = await displayI18n.getCategoryDisplayText(crumb.cid, locale);
      if (!t || !t.name || !String(t.name).trim()) {
        throw new Error(`[[caiz:error.missing-breadcrumb-i18n, ${crumb.cid}, ${locale}]]`);
      }
      crumb.text = String(t.name);
    }
  }
  return breadcrumbs;
}

module.exports = {
  applyBreadcrumbI18n,
};

