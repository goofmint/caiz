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
      if (t && t.name && String(t.name).trim()) {
        crumb.text = String(t.name);
      }
      // If missing translation, keep original text as-is (no silent defaults)
    }
  }
  return breadcrumbs;
}

module.exports = {
  applyBreadcrumbI18n,
};
