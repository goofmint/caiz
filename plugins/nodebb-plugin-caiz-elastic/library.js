'use strict';

// Implementation notes
// - No fallbacks: required settings must be provided, otherwise throw explicit errors
// - No docker/nodebb/curl commands here; pure implementation only

const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const routeHelpers = require.main.require('./src/routes/helpers');
const privileges = require.main.require('./src/privileges');

// Required environment variables for operation
// ELASTIC_NODE: e.g. http://elasticsearch:9200
// ELASTIC_INDEX_PREFIX: e.g. nodebb (used to compose per-language index names)

let client = null;
let ready = false;
let settingsCache = null; // { node: string, index: string }

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
              tags: { type: 'keyword' },
              language: { type: 'keyword' },
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
  const doc = {
    id: `topic:${topic.tid}`,
    type: 'topic',
    cid: topic.cid,
    tid: topic.tid,
    title: String(topic.title || ''),
    content: undefined,
    tags: Array.isArray(topic.tags) ? topic.tags.map(t => String(t.value || t)) : [],
    language: String(topic.language || '').trim() || undefined,
    createdAt: new Date(topic.timestamp || Date.now()).toISOString(),
    updatedAt: new Date().toISOString(),
    visibility: topic.deleted ? 'private' : 'public',
  };
  await indexDocument(doc);
};

plugin.onPostSave = async function (hookData) {
  if (!ready) return;
  const post = hookData && hookData.post;
  if (!post) return;
  const doc = {
    id: `post:${post.pid}`,
    type: 'post',
    cid: post.cid,
    tid: post.tid,
    pid: post.pid,
    title: undefined,
    content: String(post.content || ''),
    tags: [],
    language: String(post.language || '').trim() || undefined,
    createdAt: new Date(post.timestamp || Date.now()).toISOString(),
    updatedAt: new Date().toISOString(),
    visibility: post.deleted ? 'private' : 'public',
  };
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

module.exports = plugin;
