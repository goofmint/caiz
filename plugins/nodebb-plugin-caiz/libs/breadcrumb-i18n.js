'use strict';

const displayI18n = require('./community-i18n-display');

async function applyBreadcrumbI18n(breadcrumbs, locale) {
  if (!Array.isArray(breadcrumbs)) return breadcrumbs;
  if (!locale) return breadcrumbs;

  // Filter to valid object crumbs with a cid; ignore malformed items
  const items = breadcrumbs
    .map((crumb, index) => ({ crumb, index }))
    .filter(({ crumb }) => crumb && typeof crumb === 'object' && crumb.cid);

  // Run all lookups in parallel; catch per-item to avoid failing the whole batch
  const lookups = items.map(({ crumb }) =>
    displayI18n
      .getCategoryDisplayText(crumb.cid, locale)
      .catch(() => null)
  );

  const results = await Promise.all(lookups);

  // Apply translated name when present; otherwise leave original text
  results.forEach((t, i) => {
    const { crumb } = items[i];
    const name = t && t.name;
    const trimmed = typeof name === 'string' ? String(name).trim() : '';
    if (trimmed) {
      crumb.text = trimmed;
    }
  });
  return breadcrumbs;
}

module.exports = {
  applyBreadcrumbI18n,
};
