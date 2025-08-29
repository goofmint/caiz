'use strict';

const data = require('./community/data');
const user = require.main.require('./src/user');

const LANG_KEYS = [
  'en','zh-CN','hi','es','ar','fr','bn','ru','pt','ur',
  'id','de','ja','fil','tr','ko','fa','sw','ha','it',
];

function pickBestLocale(targets, supported) {
  // Exact match first
  for (const t of targets) {
    if (supported.includes(t)) return t;
  }
  // Match by base language (e.g., en-US -> en)
  for (const t of targets) {
    const base = t.split('-')[0];
    if (supported.includes(base)) return base;
  }
  return null;
}

function parseAcceptLanguage(header) {
  if (!header || typeof header !== 'string') return [];
  try {
    return header
      .split(',')
      .map(s => {
        const [code, q] = s.trim().split(';q=');
        return { code: code.trim(), q: q ? parseFloat(q) : 1 };
      })
      .sort((a, b) => b.q - a.q)
      .map(x => x.code);
  } catch {
    return [];
  }
}

async function resolveLocale(req) {
  // 1) URL query parameter `locale`
  const q = req && req.query && req.query.locale;
  if (typeof q === 'string' && q.trim()) {
    const exact = pickBestLocale([q.trim()], LANG_KEYS);
    if (exact) return exact;
  }

  // 2) User setting if logged in
  if (req && req.uid) {
    try {
      const settings = await user.getSettings(req.uid);
      const lang = settings && settings.userLang;
      if (lang) {
        const matched = pickBestLocale([lang], LANG_KEYS);
        if (matched) return matched;
      }
    } catch {}
  }

  // 3) Browser Accept-Language
  const langs = parseAcceptLanguage(req && req.headers && req.headers['accept-language']);
  const matched = pickBestLocale(langs, LANG_KEYS);
  if (matched) return matched;

  return null;
}

async function getCategoryDisplayText(cid, locale) {
  if (!cid || !locale) return { };
  const name = await data.getObjectField(`category:${cid}`, `i18n:name:${locale}`);
  const description = await data.getObjectField(`category:${cid}`, `i18n:description:${locale}`);
  const result = {};
  if (typeof name === 'string' && name.trim()) result.name = name;
  if (typeof description === 'string' && description.trim()) result.description = description;
  return result;
}

module.exports = {
  LANG_KEYS,
  resolveLocale,
  getCategoryDisplayText,
};

