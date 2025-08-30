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
          settings: {
            analysis: {
              analyzer: {
                latin_ws: {
                  type: 'custom',
                  tokenizer: 'whitespace',
                  filter: ['lowercase', 'asciifolding']
                }
              }
            }
          },
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
              title_tokens_norm: { type: 'keyword' },
              content_tokens_norm: { type: 'keyword' },
              title_tokens_text: { type: 'text', analyzer: 'latin_ws' },
              content_tokens_text: { type: 'text', analyzer: 'latin_ws' },
              name_tokens: { type: 'keyword' },
              description_tokens: { type: 'keyword' },
              name_tokens_norm: { type: 'keyword' },
              description_tokens_norm: { type: 'keyword' },
              name_tokens_text: { type: 'text', analyzer: 'latin_ws' },
              description_tokens_text: { type: 'text', analyzer: 'latin_ws' },
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

async function indexDocument(doc, opts = {}) {
  const c = getClient();
  const index = getIndexName();
  await ensureIndex();
  const refresh = opts && Object.prototype.hasOwnProperty.call(opts, 'refresh') ? opts.refresh : true;
  await c.index({ index, id: doc.id, document: doc, refresh: refresh ? 'true' : undefined });
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

function nfkcLower(s) { return String(s).normalize('NFKC').toLowerCase(); }
function stripDiacritics(s) { return s.normalize('NFD').replace(/\p{M}+/gu, ''); }
function toHiragana(s) {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code >= 0x30A1 && code <= 0x30F6) {
      out += String.fromCodePoint(code - 0x60);
    } else {
      out += ch;
    }
  }
  return out;
}
function isJapaneseChar(ch) {
  const code = ch.codePointAt(0);
  // Hiragana, Katakana, Kanji(Han)
  return (
    (code >= 0x3040 && code <= 0x309F) ||
    (code >= 0x30A0 && code <= 0x30FF) ||
    (code >= 0x4E00 && code <= 0x9FFF)
  );
}
function makeBigrams(s) {
  const arr = [];
  const chars = Array.from(s).filter(isJapaneseChar);
  for (let i = 0; i < chars.length - 1; i++) {
    arr.push(chars[i] + chars[i + 1]);
  }
  return arr;
}
function germanVariants(tok) {
  const v = new Set([tok]);
  v.add(tok.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'));
  v.add(stripDiacritics(tok));
  return Array.from(v);
}
function englishSingularCandidates(tok) {
  const arr = [tok];
  if (tok.endsWith('ies') && tok.length > 4) arr.push(tok.slice(0, -3) + 'y');
  if (tok.endsWith('es') && tok.length > 3) arr.push(tok.slice(0, -2));
  if (tok.endsWith('s') && tok.length > 3) arr.push(tok.slice(0, -1));
  return Array.from(new Set(arr));
}
function generateVariants(raw, lang) {
  const set = new Set();
  const base = nfkcLower(raw);
  set.add(base);
  // Japanese unify to hiragana and also variant without prolonged sound mark
  const jp = toHiragana(base);
  set.add(jp);
  set.add(jp.replace(/\u30FC/g, ''));
  // Add simple bigrams for Japanese sequences
  makeBigrams(jp).forEach(t => set.add(t));
  // Diacritics removal
  set.add(stripDiacritics(base));
  // German expansions
  germanVariants(base).forEach(t => set.add(t));
  // English simple singulars
  englishSingularCandidates(base).forEach(t => set.add(t));
  return Array.from(set).filter(s => s && s.trim());
}

function assertFullTranslations(translations) {
  if (!translations || typeof translations !== 'object') {
    throw new Error('[caiz-elastic] Invalid translations payload');
  }
  for (const lang of LANG_KEYS) {
    const v = translations[lang];
    if (!v || typeof v !== 'string' || !v.trim()) {
      throw new Error(`[caiz-elastic] Incomplete translations, missing ${lang}`);
    }
  }
}

function tokensFromTranslations(translations, withNorm = false) {
  assertFullTranslations(translations);
  const set = new Set();
  for (const lang of LANG_KEYS) {
    const text = String(translations[lang] || '');
    const seg = new Intl.Segmenter(lang, { granularity: 'word' });
    for (const part of seg.segment(text)) {
      if (part && part.isWordLike && part.segment) {
        if (withNorm) {
          generateVariants(part.segment, lang).forEach(v => set.add(v));
        } else {
          set.add(nfkcLower(part.segment));
        }
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
  const titleTokens = tokensFromTranslations(translations, false);
  const titleTokensNorm = tokensFromTranslations(translations, true);
  return {
    id: `topic:${topic.tid}`,
    type: 'topic',
    cid: topic.cid,
    tid: topic.tid,
    title,
    title_tokens: titleTokens,
    title_tokens_norm: titleTokensNorm,
    title_tokens_text: titleTokensNorm.join(' '),
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
  const contentTokens = tokensFromTranslations(translations, false);
  const contentTokensNorm = tokensFromTranslations(translations, true);
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
    content_tokens_norm: contentTokensNorm,
    content_tokens_text: contentTokensNorm.join(' '),
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
// Admin: reindex topics/posts/communities
adminSockets.plugins['caiz-elastic'].reindex = async function (socket, data) {
  const isAdmin = await privileges.admin.can('admin:settings', socket.uid);
  if (!isAdmin) {
    throw new Error('[[error:no-privileges]]');
  }
  if (!ready) {
    throw new Error('[caiz-elastic] Not configured');
  }
  const scope = data && data.scope ? String(data.scope) : 'all';

  const Categories = require.main.require('./src/categories');
  const Topics = require.main.require('./src/topics');
  const Posts = require.main.require('./src/posts');

  let processed = { topics: 0, posts: 0, communities: 0 };

  function emitProgress(stage, message, progress) {
    try {
      socket.emit('admin.plugins.caiz-elastic.reindex.progress', { stage, message, progress });
    } catch {}
  }

  // helper: ensure community translations via category fields
  const reindexCommunities = async () => {
    const all = await Categories.getAllCategoryFields(['cid', 'name', 'description', 'parentCid']);
    const parents = (all || []).filter(c => c && c.parentCid === 0);
    emitProgress('communities:start', `total=${parents.length}`);
    for (const cat of parents) {
      try {
        const nameTranslations = {};
        const descTranslations = {};
        let missing = [];
        for (const lang of LANG_KEYS) {
          const name = await db.getObjectField(`category:${cat.cid}`, `i18n:name:${lang}`);
          if (!name || !String(name).trim()) {
            missing.push(lang);
          } else {
            nameTranslations[lang] = String(name);
          }
          const desc = await db.getObjectField(`category:${cat.cid}`, `i18n:description:${lang}`);
          if (desc && String(desc).trim()) descTranslations[lang] = String(desc);
        }

        if (missing.length) {
          // Try to fetch translations now (no fallback masking — if it fails, skip)
          try {
            const communityI18n = require('../nodebb-plugin-caiz/libs/community-i18n');
            const t = await communityI18n.translateOnCreate({ name: String(cat.name || ''), description: String(cat.description || '') });
            await communityI18n.saveTranslations(cat.cid, t);
            // Reload from DB to ensure we have persisted values
            for (const lang of LANG_KEYS) {
              const name = await db.getObjectField(`category:${cat.cid}`, `i18n:name:${lang}`);
              if (!name || !String(name).trim()) {
                throw new Error(`translation still missing for ${lang}`);
              }
              nameTranslations[lang] = String(name);
              const desc = await db.getObjectField(`category:${cat.cid}`, `i18n:description:${lang}`);
              if (desc && String(desc).trim()) descTranslations[lang] = String(desc);
            }
          } catch (e) {
            emitProgress('communities:skip', `cid=${cat.cid} reason=${e.message || String(e)}`);
            continue;
          }
        }

        await plugin.indexCommunity({
          community: { cid: cat.cid, name: cat.name, description: cat.description },
          nameTranslations,
          descTranslations: Object.keys(descTranslations).length ? descTranslations : undefined,
        });
        processed.communities++;
        emitProgress('communities:progress', `cid=${cat.cid}`, { done: processed.communities, total: parents.length });
      } catch (err) {
        emitProgress('communities:error', `cid=${cat.cid} ${err.message || String(err)}`);
        // continue with next
      }
    }
  };

  const reindexTopics = async () => {
    const all = await Categories.getAllCidsFromSet('categories:cid');
    const seen = new Set();
    let total = 0;
    for (const cid of all) {
      total += await db.sortedSetCard(`cid:${cid}:tids`);
    }
    emitProgress('topics:start', `total≈${total}`);
    for (const cid of all) {
      const tids = await db.getSortedSetRange(`cid:${cid}:tids`, 0, -1);
      for (const tid of tids) {
        if (seen.has(tid)) continue;
        seen.add(tid);
        const t = await Topics.getTopicData(tid);
        if (!t || !t.tid) continue;
        let translations;
        try {
          translations = await loadTranslations('topic', t.tid);
        } catch {
          const SettingsManager = require('../nodebb-plugin-auto-translate/lib/config/settings');
          const PromptManager = require('../nodebb-plugin-auto-translate/lib/translation/prompt-manager');
          const GeminiApiClient = require('../nodebb-plugin-auto-translate/lib/translation/api-client');
          const settingsManager = new SettingsManager();
          await settingsManager.init();
          const settings = await settingsManager.getRawSettings();
          if (!settings.api || !settings.api.geminiApiKey) throw new Error('Missing translation API key');
          const pm = new PromptManager();
          const api = new GeminiApiClient();
          api.initialize(settings);
          const prompt = pm.buildTranslationPrompt(`# ${String(t.title || '')}`, settings);
          const res = await api.translateContent(prompt, settings);
          if (!res || !res.success || !res.translations) throw new Error('Translation failed');
          translations = res.translations;
          await db.setObject(`auto-translate:topic:${t.tid}`, { original: `# ${t.title}`, translations, created: Date.now() });
        }
        await plugin.indexTopic({ topic: t, translations });
        processed.topics++;
        emitProgress('topics:progress', `tid=${t.tid}`, { done: processed.topics, total });
      }
    }
  };

  const reindexPosts = async () => {
    const pids = await db.getSortedSetRange('posts:pid', 0, -1);
    emitProgress('posts:start', `total=${pids.length}`);
    for (const pid of pids) {
      const p = await Posts.getPostData(pid);
      if (!p || !p.pid) continue;
      let translations;
      try {
        translations = await loadTranslations('post', p.pid);
      } catch {
        const SettingsManager = require('../nodebb-plugin-auto-translate/lib/config/settings');
        const PromptManager = require('../nodebb-plugin-auto-translate/lib/translation/prompt-manager');
        const GeminiApiClient = require('../nodebb-plugin-auto-translate/lib/translation/api-client');
        const settingsManager = new SettingsManager();
        await settingsManager.init();
        const settings = await settingsManager.getRawSettings();
        if (!settings.api || !settings.api.geminiApiKey) throw new Error('Missing translation API key');
        const pm = new PromptManager();
        const api = new GeminiApiClient();
        api.initialize(settings);
        const prompt = pm.buildTranslationPrompt(String(p.content || ''), settings);
        const res = await api.translateContent(prompt, settings);
        if (!res || !res.success || !res.translations) throw new Error('Translation failed');
        translations = res.translations;
        await db.setObject(`auto-translate:post:${p.pid}`, { original: p.content, translations, created: Date.now() });
      }
      await plugin.indexPost({ post: p, translations });
      processed.posts++;
      emitProgress('posts:progress', `pid=${p.pid}`, { done: processed.posts, total: pids.length });
    }
  };

  emitProgress('start', `scope=${scope}`);
  setImmediate(async () => {
    try {
      if (scope === 'all' || scope === 'communities') await reindexCommunities();
      if (scope === 'all' || scope === 'topics') await reindexTopics();
      if (scope === 'all' || scope === 'posts') await reindexPosts();
      try { const c = getClient(); await c.indices.refresh({ index: getIndexName() }); } catch {}
      emitProgress('done', 'completed', processed);
    } catch (err) {
      emitProgress('error', err.message || String(err));
    }
  });

  return { ok: true, started: true };
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

// NodeBB search adapter — replace core dbsearch by returning ids array
plugin.onSearchQuery = async function (payload) {
  if (!ready) {
    return payload.ids || [];
  }
  const indexType = payload && payload.index;
  const q = payload && payload.content;
  if (!indexType || !q || !String(q).trim()) {
    throw new Error('[caiz-elastic] Missing search parameters');
  }
  const c = getClient();
  const index = getIndexName();

  const qTokens = tokensFromTranslations(
    LANG_KEYS.reduce((acc, lang) => { acc[lang] = String(q); return acc; }, {}),
    true
  );
  if (!qTokens.length) {
    throw new Error('[caiz-elastic] No tokens produced from query');
  }

  const fields = indexType === 'topic'
    ? ['title_tokens', 'title_tokens_norm']
    : ['content_tokens', 'content_tokens_norm'];
  const isLatin = /\p{Script=Latin}/u.test(String(q));
  const shouldClauses = [];
  for (const field of fields) {
    for (const tok of qTokens) { shouldClauses.push({ term: { [field]: tok } }); }
  }
  const mustClauses = [{ term: { type: indexType } }, { term: { visibility: 'public' } }];
  if (Array.isArray(payload.cid) && payload.cid.length) {
    mustClauses.push({ terms: { cid: payload.cid.map(Number).filter(n => Number.isInteger(n)) } });
  }

  if (isLatin) {
    if (indexType === 'topic') {
      shouldClauses.push({ match: { title_tokens_text: { query: String(q), fuzziness: 'AUTO', prefix_length: 1 } } });
    } else {
      shouldClauses.push({ match: { content_tokens_text: { query: String(q), fuzziness: 'AUTO', prefix_length: 1 } } });
    }
  }
  const es = await c.search({
    index,
    query: { bool: { must: mustClauses, should: shouldClauses, minimum_should_match: 1 } },
    _source: false,
    from: 0,
    size: Number(payload.searchData && payload.searchData.limit || 50) || 50,
  });

  const hits = (es.hits && es.hits.hits) || [];
  const ids = [];
  for (const h of hits) {
    const id = h._id || '';
    if (indexType === 'post' && id.startsWith('post:')) {
      const pid = parseInt(id.slice(5), 10); if (Number.isInteger(pid)) ids.push(pid);
    } else if (indexType === 'topic' && id.startsWith('topic:')) {
      const tid = parseInt(id.slice(6), 10); if (Number.isInteger(tid)) ids.push(tid);
    }
  }
  return ids;
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

// Public API for other plugins (server-to-server usage)
// These functions DO NOT use fallbacks. Translations must include all LANG_KEYS.
plugin.indexTopic = async function ({ topic, translations }, opts = {}) {
  if (!ready) throw new Error('[caiz-elastic] Not configured');
  if (!topic || !topic.tid) throw new Error('[caiz-elastic] Missing topic');
  assertFullTranslations(translations);
  const titleTokens = tokensFromTranslations(translations);
  const doc = {
    id: `topic:${topic.tid}`,
    type: 'topic',
    cid: topic.cid,
    tid: topic.tid,
    title: String(topic.title || ''),
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
  await indexDocument(doc, opts);
};

plugin.indexPost = async function ({ post, translations }, opts = {}) {
  if (!ready) throw new Error('[caiz-elastic] Not configured');
  if (!post || !post.pid) throw new Error('[caiz-elastic] Missing post');
  assertFullTranslations(translations);
  const contentTokens = tokensFromTranslations(translations);
  const doc = {
    id: `post:${post.pid}`,
    type: 'post',
    cid: post.cid,
    tid: post.tid,
    pid: post.pid,
    title: undefined,
    title_tokens: undefined,
    content: String(post.content || ''),
    content_tokens: contentTokens,
    tags: [],
    language: undefined,
    locale: undefined,
    createdAt: new Date(post.timestamp || Date.now()).toISOString(),
    updatedAt: new Date().toISOString(),
    visibility: post.deleted ? 'private' : 'public',
  };
  await indexDocument(doc, opts);
};

plugin.indexCommunity = async function ({ community, nameTranslations, descTranslations }, opts = {}) {
  if (!ready) throw new Error('[caiz-elastic] Not configured');
  if (!community || !community.cid) throw new Error('[caiz-elastic] Missing community');
  assertFullTranslations(nameTranslations);
  const nameTokens = tokensFromTranslations(nameTranslations, false);
  const nameTokensNorm = tokensFromTranslations(nameTranslations, true);
  let descriptionTokens = undefined;
  let descriptionTokensNorm = undefined;
  if (descTranslations) {
    assertFullTranslations(descTranslations);
    descriptionTokens = tokensFromTranslations(descTranslations, false);
    descriptionTokensNorm = tokensFromTranslations(descTranslations, true);
  }
  const doc = {
    id: `community:${community.cid}`,
    type: 'community',
    cid: community.cid,
    title: String(community.name || ''),
    name_tokens: nameTokens,
    name_tokens_norm: nameTokensNorm,
    name_tokens_text: nameTokensNorm ? nameTokensNorm.join(' ') : undefined,
    content: String(community.description || ''),
    description_tokens: descriptionTokens,
    description_tokens_norm: descriptionTokensNorm,
    description_tokens_text: descriptionTokensNorm ? descriptionTokensNorm.join(' ') : undefined,
    tags: [],
    language: undefined,
    locale: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    visibility: 'public',
  };
  await indexDocument(doc, opts);
};

plugin.removeTopic = async function ({ tid }) {
  if (!ready) throw new Error('[caiz-elastic] Not configured');
  if (!tid) throw new Error('[caiz-elastic] Missing tid');
  await deleteDocument(`topic:${tid}`);
};

plugin.removePost = async function ({ pid }) {
  if (!ready) throw new Error('[caiz-elastic] Not configured');
  if (!pid) throw new Error('[caiz-elastic] Missing pid');
  await deleteDocument(`post:${pid}`);
};
