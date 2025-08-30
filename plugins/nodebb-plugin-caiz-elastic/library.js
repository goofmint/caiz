'use strict';

// Implementation notes
// - No fallbacks: required settings must be provided, otherwise throw explicit errors
// - No docker/nodebb/curl commands here; pure implementation only

const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const routeHelpers = require.main.require('./src/routes/helpers');
const privileges = require.main.require('./src/privileges');
const Users = require.main.require('./src/user');
const db = require.main.require('./src/database');

// Required environment variables for operation
// ELASTIC_NODE: e.g. http://elasticsearch:9200
// ELASTIC_INDEX_PREFIX: e.g. nodebb (used to compose per-language index names)

let client = null;
let ready = false;
let settingsCache = null; // { node: string, index: string }
const LANG_KEYS = [
  'en','zh-CN','hi','es','ar','fr','bn','ru','pt','ur',
  'id','de','ja','fil','tr','ko','fa','sw','ha','it',
];

function getEnv(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : null;
}

async function loadSettings() {
  // Prefer admin settings; if not set, try env; if neither, return null (disabled)
  const s = await meta.settings.get('nodebb-plugin-caiz-elastic');
  const node = (s && s.node && String(s.node).trim()) || getEnv('ELASTIC_NODE');
  const index = (s && s.index && String(s.index).trim()) || getEnv('ELASTIC_INDEX_PREFIX');
  if (node && index) {
    settingsCache = { node, index };
    return settingsCache;
  }
  settingsCache = null;
  return null;
}

function getClient() {
  if (client) return client;
  if (!settingsCache) {
    throw new Error('[caiz-elastic] Not configured');
  }
  const { Client } = require('@elastic/elasticsearch');
  client = new Client({ node: settingsCache.node });
  return client;
}

function getIndexName() {
  if (!settingsCache || !settingsCache.index) {
    throw new Error('[caiz-elastic] Missing index name');
  }
  return settingsCache.index;
}

async function ensureIndex() {
  const c = getClient();
  const name = getIndexName();
  try {
    const exists = await c.indices.exists({ index: name });
    if (!exists) {
      // Minimal mapping; analyzers expected to be prepared out-of-band
      await c.indices.create({
        index: name,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              type: { type: 'keyword' },
              cid: { type: 'integer' },
              tid: { type: 'integer' },
              pid: { type: 'integer' },
              title: { type: 'text' },
              content: { type: 'text' },
              title_tokens: { type: 'keyword' },
              content_tokens: { type: 'keyword' },
              tags: { type: 'keyword' },
              language: { type: 'keyword' },
              locale: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              visibility: { type: 'keyword' }
            }
          }
        }
      });
      winston.info(`[caiz-elastic] Created index: ${name}`);
    }
  } catch (err) {
    throw new Error(`[caiz-elastic] ensureIndex failed: ${err.message}`);
  }
}

function getUserLangFromReq(req) {
  // Attempt to use NodeBB user settings; no fallback to defaults
  if (!req || !req.uid) {
    throw new Error('[caiz-elastic] Missing request user for language resolution');
  }
  return meta.user.getSettings(req.uid).then(settings => {
    const lang = settings && settings.userLang;
    if (!lang) {
      throw new Error('[caiz-elastic] Missing userLang in user settings');
    }
    return lang;
  });
}

async function indexDocument(doc) {
  const c = getClient();
  const index = getIndexName();
  await ensureIndex();
  await c.index({ index, id: doc.id, document: doc, refresh: 'true' });
}

async function deleteDocument(id) {
  const c = getClient();
  const index = getIndexName();
  try {
    await c.delete({ index, id, refresh: 'true' });
  } catch (err) {
    // No silent fallbacks: surface 404 as explicit error
    if (err && err.meta && err.meta.statusCode === 404) {
      throw new Error(`[caiz-elastic] Document not found for delete: ${id}`);
    }
    throw err;
  }
}

async function updateVisibility(id, visibility) {
  const c = getClient();
  const index = getIndexName();
  await c.update({ index, id, doc: { visibility, updatedAt: new Date().toISOString() }, refresh: 'true' });
}

function getRequiredLocale(raw) {
  const v = raw && String(raw).trim();
  if (!v) throw new Error('[caiz-elastic] Missing locale');
  return v;
}

async function resolveLocaleFromUid(uid) {
  if (!uid) throw new Error('[caiz-elastic] Missing uid for locale resolution');
  const settings = await Users.getSettings(uid);
  const lang = settings && settings.userLang;
  if (!lang) throw new Error('[caiz-elastic] Missing userLang in settings');
  return String(lang).trim();
}

async function resolveLocaleForPost(post) {
  if (!post) throw new Error('[caiz-elastic] Missing post payload');
  if (post.userLang) return getRequiredLocale(post.userLang);
  if (post.language) return getRequiredLocale(post.language);
  if (post.uid) return resolveLocaleFromUid(post.uid);
  throw new Error('[caiz-elastic] Cannot resolve locale for post');
}

async function resolveLocaleForTopic(topic) {
  if (!topic) throw new Error('[caiz-elastic] Missing topic payload');
  if (topic.userLang) return getRequiredLocale(topic.userLang);
  if (topic.language) return getRequiredLocale(topic.language);
  if (topic.uid) return resolveLocaleFromUid(topic.uid);
  throw new Error('[caiz-elastic] Cannot resolve locale for topic');
}

function tokenize(input, locale) {
  if (typeof input !== 'string') throw new Error('[caiz-elastic] Tokenize input must be string');
  const seg = new Intl.Segmenter(locale, { granularity: 'word' });
  const iter = seg.segment(input);
  const tokens = [];
  for (const part of iter) {
    if (part && part.isWordLike && part.segment) {
      tokens.push(part.segment);
    }
  }
  if (!tokens.length) throw new Error('[caiz-elastic] No tokens produced');
  return tokens;
}

async function loadTranslations(type, id) {
  const key = `auto-translate:${type}:${id}`;
  const obj = await db.getObject(key);
  if (!obj || !obj.translations || typeof obj.translations !== 'object') {
    throw new Error(`[caiz-elastic] Missing translations for ${type}:${id}`);
  }
  const translations = obj.translations;
  // Ensure all required languages exist and are non-empty strings
  for (const lang of LANG_KEYS) {
    const v = translations[lang];
    if (!v || typeof v !== 'string' || !v.trim()) {
      throw new Error(`[caiz-elastic] Incomplete translations for ${type}:${id}, missing ${lang}`);
    }
  }
  return translations;
}

function normalizeToken(t) {
  return String(t).toLowerCase();
}

function tokensFromTranslations(translations, field) {
  const set = new Set();
  for (const lang of LANG_KEYS) {
    const text = String(translations[lang] || '');
    const seg = new Intl.Segmenter(lang, { granularity: 'word' });
    for (const part of seg.segment(text)) {
      if (part && part.isWordLike && part.segment) {
        set.add(normalizeToken(part.segment));
      }
    }
  }
  if (set.size === 0) {
    throw new Error('[caiz-elastic] No tokens produced from translations');
  }
  return Array.from(set);
}

async function buildTopicDoc(topic) {
  const translations = await loadTranslations('topic', topic.tid);
  const title = String(topic.title || '');
  const titleTokens = tokensFromTranslations(translations, 'title');
  return {
    id: `topic:${topic.tid}`,
    type: 'topic',
    cid: topic.cid,
    tid: topic.tid,
    title,
    title_tokens: titleTokens,
    content: undefined,
    content_tokens: undefined,
    tags: Array.isArray(topic.tags) ? topic.tags.map(t => String(t.value || t)) : [],
    language: undefined,
    locale: undefined,
    createdAt: new Date(topic.timestamp || Date.now()).toISOString(),
    updatedAt: new Date().toISOString(),
    visibility: topic.deleted ? 'private' : 'public',
  };
}

async function buildPostDoc(post) {
  const translations = await loadTranslations('post', post.pid);
  const content = String(post.content || '');
  const contentTokens = tokensFromTranslations(translations, 'content');
  return {
    id: `post:${post.pid}`,
    type: 'post',
    cid: post.cid,
    tid: post.tid,
    pid: post.pid,
    title: undefined,
    title_tokens: undefined,
    content,
    content_tokens: contentTokens,
    tags: [],
    language: undefined,
    locale: undefined,
    createdAt: new Date(post.timestamp || Date.now()).toISOString(),
    updatedAt: new Date().toISOString(),
    visibility: post.deleted ? 'private' : 'public',
  };
}

const plugin = {};

plugin.init = async function (params) {
  try {
    const { router, middleware } = params;
    // Admin page
    routeHelpers.setupAdminPageRoute(router, '/admin/plugins/caiz-elastic', [], (req, res) => {
      res.render('admin/plugins/caiz-elastic');
    });

    // Load settings; if missing, stay disabled (do not throw)
    await loadSettings();
    if (settingsCache) {
      const c = getClient();
      await c.ping();
      ready = true;
      winston.info('[caiz-elastic] Initialized');
    } else {
      ready = false;
      winston.warn('[caiz-elastic] Not configured; plugin is disabled until settings are saved');
    }
  } catch (err) {
    ready = false;
    winston.error(`[caiz-elastic] Initialization failed: ${err.message}`);
  }
};

// Admin sockets
const adminSockets = require.main.require('./src/socket.io/admin');
adminSockets.plugins = adminSockets.plugins || {};
adminSockets.plugins['caiz-elastic'] = adminSockets.plugins['caiz-elastic'] || {};

adminSockets.plugins['caiz-elastic'].getSettings = async function (socket) {
  const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
  if (!isAdmin) {
    throw new Error('[[error:no-privileges]]');
  }
  const s = await meta.settings.get('nodebb-plugin-caiz-elastic');
  const node = s && s.node;
  const index = s && s.index;
  return { node: node || '', index: index || '', ready };
};

adminSockets.plugins['caiz-elastic'].saveSettings = async function (socket, data) {
  const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
  if (!isAdmin) {
    throw new Error('[[error:no-privileges]]');
  }
  if (!data || !data.node || !data.index) {
    throw new Error('Invalid parameters');
  }
  await meta.settings.set('nodebb-plugin-caiz-elastic', { node: String(data.node).trim(), index: String(data.index).trim() });
  // Reload settings and try to connect immediately
  client = null;
  await loadSettings();
  if (settingsCache) {
    try {
      const c = getClient();
      await c.ping();
      ready = true;
    } catch (e) {
      ready = false;
      throw new Error('Failed to connect to Elasticsearch');
    }
  } else {
    ready = false;
  }
  return { success: true, ready };
};

plugin.onTopicSave = async function (hookData) {
  if (!ready) return;
  const topic = hookData && hookData.topic;
  if (!topic) return;
  const doc = await buildTopicDoc(topic);
  await indexDocument(doc);
};

plugin.onPostSave = async function (hookData) {
  if (!ready) return;
  const post = hookData && hookData.post;
  if (!post) return;
  const doc = await buildPostDoc(post);
  await indexDocument(doc);
};

plugin.onTopicPurge = async function (hookData) {
  if (!ready) return;
  const topic = hookData && hookData.topic;
  if (!topic) return;
  await deleteDocument(`topic:${topic.tid}`);
};

plugin.onPostPurge = async function (hookData) {
  if (!ready) return;
  const post = hookData && hookData.post;
  if (!post) return;
  await deleteDocument(`post:${post.pid}`);
};

plugin.onSearchQuery = async function (data) {
  if (!ready) {
    // If not ready, prevent takeover (leave core/dbsearch to handle). Do not return results.
    return data;
  }
  const q = data && data.data && data.data.query;
  if (!q || !String(q).trim()) {
    throw new Error('[caiz-elastic] Missing query');
  }
  const c = getClient();
  const index = getIndexName();

  // No fallback analyzers; rely on index-side config. Here we just query title/content fields
  const es = await c.search({
    index,
    query: {
      multi_match: {
        query: String(q).trim(),
        fields: ['title^2', 'content'],
        type: 'best_fields'
      }
    },
    highlight: {
      fields: { title: {}, content: {} }
    },
    from: Number(data.data.searchIn === 'titles' ? 0 : (data.data.start || 0)) || 0,
    size: Number(data.data.limit || 20) || 20,
  });

  const hits = (es.hits && es.hits.hits) || [];
  const pids = [];
  const tids = [];
  hits.forEach(h => {
    const id = h._id || (h._source && h._source.id);
    if (!id) return;
    if (String(id).startsWith('post:')) {
      const pid = parseInt(String(id).slice(5), 10);
      if (Number.isInteger(pid)) pids.push(pid);
    } else if (String(id).startsWith('topic:')) {
      const tid = parseInt(String(id).slice(6), 10);
      if (Number.isInteger(tid)) tids.push(tid);
    }
  });

  // Populate NodeBB search response shape
  // Respect searchIn: titles => return tids; else return pids
  if (data.data && data.data.searchIn === 'titles') {
    data.tids = tids;
  } else {
    data.pids = pids;
  }
  return data;
};

// Additional hooks for index maintenance using visibility and edits
plugin.onPostDelete = async function (hookData) {
  if (!ready) return;
  const post = hookData && hookData.post;
  if (!post || !post.pid) return;
  await updateVisibility(`post:${post.pid}`, 'private');
};

plugin.onPostRestore = async function (hookData) {
  if (!ready) return;
  const post = hookData && hookData.post;
  if (!post || !post.pid) return;
  await updateVisibility(`post:${post.pid}`, 'public');
};

plugin.onPostEdit = async function (hookData) {
  if (!ready) return;
  const post = hookData && hookData.post;
  if (!post) return;
  const doc = await buildPostDoc(post);
  await indexDocument(doc);
};

plugin.onTopicPost = async function (hookData) {
  if (!ready) return;
  const topic = hookData && hookData.topic;
  if (!topic) return;
  const doc = await buildTopicDoc(topic);
  await indexDocument(doc);
};

plugin.onTopicDelete = async function (hookData) {
  if (!ready) return;
  const topic = hookData && hookData.topic;
  if (!topic || !topic.tid) return;
  await updateVisibility(`topic:${topic.tid}`, 'private');
};

plugin.onTopicRestore = async function (hookData) {
  if (!ready) return;
  const topic = hookData && hookData.topic;
  if (!topic || !topic.tid) return;
  await updateVisibility(`topic:${topic.tid}`, 'public');
};

plugin.onTopicEdit = async function (hookData) {
  if (!ready) return;
  const topic = hookData && hookData.topic;
  if (!topic) return;
  const doc = await buildTopicDoc(topic);
  await indexDocument(doc);
};

module.exports = plugin;

// Admin menu entry
plugin.addAdminNavigation = function (header, callback) {
  header.plugins = header.plugins || [];
  header.plugins.push({
    route: '/plugins/caiz-elastic',
    icon: 'fa-search',
    name: 'Elastic Search'
  });
  callback(null, header);
};
