'use strict';

const data = require('./community/data');

function isSemVer(v) {
  return typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v);
}

function compareSemVer(a, b) {
  const pa = a.split('.').map(n => parseInt(n, 10));
  const pb = b.split('.').map(n => parseInt(n, 10));
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function isMonotonicString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function assertVersionIncreases(prev, next) {
  if (!next) {
    throw new Error('[[caiz:error.consent.invalid-version]]');
  }
  if (!prev) return; // no previous -> any valid next ok
  if (isSemVer(prev) && isSemVer(next)) {
    if (compareSemVer(next, prev) <= 0) {
      throw new Error('[[caiz:error.consent.version-not-increasing]]');
    }
    return;
  }
  // Fallback to lexicographic strict increase for non-SemVer strings
  if (isMonotonicString(prev) && isMonotonicString(next)) {
    if (next <= prev) {
      throw new Error('[[caiz:error.consent.version-not-increasing]]');
    }
    return;
  }
  throw new Error('[[caiz:error.consent.invalid-version]]');
}

async function getRuleHeader(cid) {
  const key = `community:${cid}:consent`;
  const [version, updatedAt, updatedBy] = await Promise.all([
    data.getObjectField(key, 'version'),
    data.getObjectField(key, 'updatedAt'),
    data.getObjectField(key, 'updatedBy'),
  ]);
  if (!version) return null;
  return {
    cid: Number(cid),
    version: String(version),
    updatedAt: Number(updatedAt) || 0,
    updatedBy: Number(updatedBy) || 0,
  };
}

async function getRuleContent(cid, locale) {
  if (!locale) throw new Error('[[caiz:error.consent.invalid-params]]');
  const key = `community:${cid}:consent:content:${locale}`;
  const [markdown, updatedAt, updatedBy] = await Promise.all([
    data.getObjectField(key, 'markdown'),
    data.getObjectField(key, 'updatedAt'),
    data.getObjectField(key, 'updatedBy'),
  ]);
  if (!markdown) return null;
  return {
    locale: String(locale),
    markdown: String(markdown),
    updatedAt: Number(updatedAt) || 0,
    updatedBy: Number(updatedBy) || 0,
  };
}

async function getConsentRule(cid) {
  // Back-compat header fetch (no locale). Returns null if no header.
  return getRuleHeader(cid);
}

async function getConsentRuleForLocale(cid, locale) {
  const header = await getRuleHeader(cid);
  if (!header) return null;
  
  // Try the exact locale first
  let content = await getRuleContent(cid, locale);
  
  // Fallback logic for English variants
  if (!content && locale.startsWith('en-')) {
    // Try generic English as fallback for en-GB, en-US, etc.
    content = await getRuleContent(cid, 'en');
  }
  
  if (!content) {
    // no fallback
    throw new Error(`[[caiz:error.consent.locale-not-found, ${locale}]]`);
  }
  
  return {
    cid: header.cid,
    version: header.version,
    markdown: content.markdown,
    updatedAt: content.updatedAt,
    updatedBy: content.updatedBy,
    locale: content.locale,
  };
}

async function setConsentRule(rule) {
  const { cid, markdown, updatedAt, updatedBy, version } = rule || {};
  if (!cid || typeof markdown !== 'string' || !updatedAt || !updatedBy) {
    throw new Error('[[caiz:error.consent.invalid-rule]]');
  }
  const existing = await getRuleHeader(cid);
  // Deletion path: empty markdown clears current rule (per-locale contents and header)
  if (markdown.trim().length === 0) {
    const { LANG_KEYS } = require('./community-i18n-display');
    if (existing) {
      // Append previous contents to history
      for (const lang of LANG_KEYS) {
        const prev = await getRuleContent(cid, lang);
        if (prev) {
          const historyKey = `community:${cid}:consent:history:${lang}`;
          const entry = JSON.stringify({
            version: existing.version,
            markdown: prev.markdown,
            updatedAt: prev.updatedAt,
            updatedBy: prev.updatedBy,
            locale: lang,
          });
          await data.sortedSetAdd(historyKey, prev.updatedAt || Date.now(), entry);
        }
      }
    }
    // Clear header by setting version to empty (so header fetch returns null)
    const baseKey = `community:${cid}:consent`;
    await Promise.all([
      data.setObjectField(baseKey, 'version', ''),
      data.setObjectField(baseKey, 'updatedAt', Number(updatedAt)),
      data.setObjectField(baseKey, 'updatedBy', Number(updatedBy)),
    ]);
    // Clear per-locale content by writing empty markdown (getRuleContent returns null)
    const { LANG_KEYS: CLEAR_LANGS } = require('./community-i18n-display');
    for (const lang of CLEAR_LANGS) {
      const contentKey = `community:${cid}:consent:content:${lang}`;
      await Promise.all([
        data.setObjectField(contentKey, 'markdown', ''),
        data.setObjectField(contentKey, 'updatedAt', Number(updatedAt)),
        data.setObjectField(contentKey, 'updatedBy', Number(updatedBy)),
      ]);
    }
    const winston = require.main.require('winston');
    winston.info(`[plugin/caiz] Consent deleted cid=${cid}`);
    return;
  }
  // Auto-increment numeric version (1,2,3...)
  let nextVersion;
  if (version) {
    // If provided, validate as increasing vs existing
    assertVersionIncreases(existing && existing.version, String(version));
    nextVersion = String(version);
  } else {
    const prev = existing && existing.version ? parseInt(existing.version, 10) : 0;
    if (existing && (isNaN(prev) || prev < 0)) {
      throw new Error('[[caiz:error.consent.invalid-version]]');
    }
    nextVersion = String((prev || 0) + 1);
  }

  // Translate to all supported locales
  const settings = require('./i18n-settings');
  const apiKey = await settings.getApiKey();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  const { LANG_KEYS } = require('./community-i18n-display');
  const GeminiApiClient = require('../../nodebb-plugin-auto-translate/lib/translation/api-client');
  const client = new GeminiApiClient();
  client.initialize({ api: { geminiApiKey: apiKey } });
  // Build prompt (explicit instruction to return exact keys)
  const prompt = [
    'Translate the following community participation rules (Markdown) into the specified target locales.',
    `Only return strict JSON where each key is one of: ${JSON.stringify(LANG_KEYS)}.`,
    'Do not include any commentary or extra fields.',
    `Text:\n${markdown}`,
  ].join('\n');
  const result = await client.translateContent(prompt, {});
  if (!result || !result.success) {
    throw new Error(result && result.error ? result.error : 'Translation failed');
  }
  const translations = result.translations || {};
  // Validate coverage and non-empty
  for (const lang of LANG_KEYS) {
    const v = translations[lang];
    if (typeof v !== 'string' || !v.trim()) {
      throw new Error(`Empty translation for ${lang}`);
    }
  }
  const extra = Object.keys(translations).filter(k => !LANG_KEYS.includes(k));
  if (extra.length) {
    throw new Error(`Unexpected keys in translation: ${extra.join(',')}`);
  }

  // Persist header (version, timestamps)
  const baseKey = `community:${cid}:consent`;
  await Promise.all([
    data.setObjectField(baseKey, 'version', nextVersion),
    data.setObjectField(baseKey, 'updatedAt', Number(updatedAt)),
    data.setObjectField(baseKey, 'updatedBy', Number(updatedBy)),
  ]);

  // Append previous contents to history per-locale (immutable)
  if (existing) {
    for (const lang of LANG_KEYS) {
      const prev = await getRuleContent(cid, lang);
      if (prev) {
        const historyKey = `community:${cid}:consent:history:${lang}`;
        const entry = JSON.stringify({
          version: existing.version,
          markdown: prev.markdown,
          updatedAt: prev.updatedAt,
          updatedBy: prev.updatedBy,
          locale: lang,
        });
        await data.sortedSetAdd(historyKey, prev.updatedAt || Date.now(), entry);
      }
    }
  }

  // Save new contents per-locale
  for (const lang of LANG_KEYS) {
    const contentKey = `community:${cid}:consent:content:${lang}`;
    await Promise.all([
      data.setObjectField(contentKey, 'markdown', String(translations[lang])),
      data.setObjectField(contentKey, 'updatedAt', Number(updatedAt)),
      data.setObjectField(contentKey, 'updatedBy', Number(updatedBy)),
    ]);
  }
  const langs = LANG_KEYS.join(',');
  const winston = require.main.require('winston');
  winston.info(`[plugin/caiz] Consent saved cid=${cid} version=${nextVersion} langs=[${langs}]`);
}

async function getUserConsent(uid, cid) {
  const key = `community:${cid}:consent:user:${uid}`;
  const [version, consentedAt] = await Promise.all([
    data.getObjectField(key, 'version'),
    data.getObjectField(key, 'consentedAt'),
  ]);
  if (!version || !consentedAt) return null;
  return {
    cid: Number(cid),
    uid: Number(uid),
    version: String(version),
    consentedAt: Number(consentedAt),
  };
}

async function setUserConsent(state) {
  const { uid, cid, version, consentedAt } = state || {};
  if (!uid || !cid || !version || !consentedAt) {
    throw new Error('[[caiz:error.consent.invalid-user-consent]]');
  }
  const current = await getConsentRule(cid);
  if (!current) {
    throw new Error('[[caiz:error.consent.rule-not-found]]');
  }
  if (String(current.version) !== String(version)) {
    throw new Error('[[caiz:error.consent.version-mismatch]]');
  }
  const key = `community:${cid}:consent:user:${uid}`;
  await Promise.all([
    data.setObjectField(key, 'version', String(version)),
    data.setObjectField(key, 'consentedAt', Number(consentedAt)),
  ]);
}

function needsConsent({ uid, cid, current, user }) {
  if (!uid || !cid) throw new Error('[[caiz:error.consent.invalid-params]]');
  if (!current) return false; // no rule -> no consent required
  if (!user) return true; // no prior consent
  return String(current.version) !== String(user.version);
}

module.exports = {
  getConsentRule,
  getConsentRuleForLocale,
  getRuleContent,
  setConsentRule,
  getUserConsent,
  setUserConsent,
  needsConsent,
};
