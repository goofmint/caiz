'use strict';

const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const translator = require.main.require('./src/translator');
const parser = require('./parser');
const cache = require('./cache');

const KEY_PREFIX = 'ogp-embed:refetch:';
const ONE_MINUTE_MS = 60 * 1000;

function hashUrl(url) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(url).digest('hex');
}

function normalizeUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (err) {
    throw new Error('Invalid URL format');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are allowed');
  }
  url.username = '';
  url.password = '';
  url.hash = '';
  return url.toString();
}

async function keyFor(url) {
  return KEY_PREFIX + hashUrl(url);
}

async function getLastAcceptedAt(url) {
  const k = await keyFor(url);
  const val = await db.get(k);
  if (!val) return 0;
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

async function setLastAcceptedAt(url, ts) {
  const k = await keyFor(url);
  await db.set(k, String(ts));
  if (db.client && db.client.pexpire) {
    await db.client.pexpire(k, ONE_MINUTE_MS);
  }
}

async function translate(key) {
  // Expect proper i18n keys like '[[ogp-embed:ogp-refetch-rate-limited]]'
  return translator.translate(key);
}

module.exports = {
  // Permission: minimal policy — require authentication
  async canRequest(params) {
    const { userId } = params || {};
    if (!userId) {
      return false;
    }
    return true;
  },

  async refetch({ userId, url }) {
    if (!userId) {
      const message = await translate('[[ogp-embed:ogp-refetch-not-authenticated]]');
      return {
        accepted: false,
        error: { code: 'NOT_AUTHENTICATED', message },
      };
    }
    if (!url || typeof url !== 'string') {
      const message = await translate('[[ogp-embed:ogp-refetch-internal-error]]');
      return {
        accepted: false,
        error: { code: 'INTERNAL_ERROR', message },
      };
    }

    let normalized;
    try {
      normalized = normalizeUrl(url);
    } catch (err) {
      winston.warn(`[ogp-embed] Refetch validation failed: ${err.message}`);
      const message = await translate('[[ogp-embed:ogp-refetch-internal-error]]');
      return {
        accepted: false,
        error: { code: 'INTERNAL_ERROR', message },
      };
    }

    const now = Date.now();
    const last = await getLastAcceptedAt(normalized);
    if (last && now - last < ONE_MINUTE_MS) {
      const nextAllowedAt = last + ONE_MINUTE_MS;
      const message = await translate('[[ogp-embed:ogp-refetch-rate-limited]]');
      return {
        accepted: false,
        error: { code: 'RATE_LIMITED', message },
        nextAllowedAt,
        url: normalized,
      };
    }

    try {
      const ogpData = await parser.parse(normalized);
      if (!ogpData) {
        const message = await translate('[[ogp-embed:ogp-refetch-internal-error]]');
        return { accepted: false, error: { code: 'INTERNAL_ERROR', message }, url: normalized };
      }
      await cache.set(normalized, ogpData);
      await setLastAcceptedAt(normalized, now);
      return { accepted: true, url: normalized, nextAllowedAt: now + ONE_MINUTE_MS };
    } catch (err) {
      winston.error(`[ogp-embed] Refetch error for ${normalized}: ${err.message}`);
      const message = await translate('[[ogp-embed:ogp-refetch-internal-error]]');
      return { accepted: false, error: { code: 'INTERNAL_ERROR', message }, url: normalized };
    }
  },
};
