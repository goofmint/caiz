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

async function getConsentRule(cid) {
  const key = `community:${cid}:consent`;
  const [version, markdown, updatedAt, updatedBy] = await Promise.all([
    data.getObjectField(key, 'version'),
    data.getObjectField(key, 'markdown'),
    data.getObjectField(key, 'updatedAt'),
    data.getObjectField(key, 'updatedBy'),
  ]);
  if (!version || !markdown) return null;
  const historyCount = await data.sortedSetCard(`${key}:history`);
  const history = historyCount ? await data.getSortedSetRange(`${key}:history`, 0, -1) : [];
  const parsedHistory = history.map((s) => {
    try { return JSON.parse(s); } catch { return null; }
  }).filter(Boolean);
  return {
    cid: parseInt(cid, 10),
    version: String(version),
    markdown: String(markdown),
    updatedAt: Number(updatedAt) || 0,
    updatedBy: Number(updatedBy) || 0,
    history: parsedHistory,
  };
}

async function setConsentRule(rule) {
  const { cid, version, markdown, updatedAt, updatedBy } = rule || {};
  if (!cid || !version || !markdown || !updatedAt || !updatedBy) {
    throw new Error('[[caiz:error.consent.invalid-rule]]');
  }
  const existing = await getConsentRule(cid);
  if (existing) {
    // Enforce strict monotonic increase
    assertVersionIncreases(existing.version, version);
    // Append previous to history (immutable)
    const historyKey = `community:${cid}:consent:history`;
    const entry = JSON.stringify({
      version: existing.version,
      markdown: existing.markdown,
      updatedAt: existing.updatedAt,
      updatedBy: existing.updatedBy,
    });
    await data.sortedSetAdd(historyKey, existing.updatedAt || Date.now(), entry);
  }
  const baseKey = `community:${cid}:consent`;
  await Promise.all([
    data.setObjectField(baseKey, 'version', String(version)),
    data.setObjectField(baseKey, 'markdown', String(markdown)),
    data.setObjectField(baseKey, 'updatedAt', Number(updatedAt)),
    data.setObjectField(baseKey, 'updatedBy', Number(updatedBy)),
  ]);
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
  setConsentRule,
  getUserConsent,
  setUserConsent,
  needsConsent,
};

