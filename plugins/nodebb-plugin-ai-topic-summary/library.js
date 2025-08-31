'use strict';

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');
const database = require.main.require('./src/database');
const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const user = require.main.require('./src/user');
const privileges = require.main.require('./src/privileges');
const meta = require.main.require('./src/meta');

const { GoogleGenAI } = require('@google/genai');

const plugin = module.exports;

// Initialize Gemini AI
let genAI;

plugin.onAppLoad = async function (params) {
  const { app, router, middleware } = params;

  // Initialize Gemini AI
  const settings = await meta.settings.get('ai-topic-summary');
  if (settings && settings.geminiApiKey) {
    genAI = new GoogleGenAI({apiKey: settings.geminiApiKey});
    winston.info('[plugin/ai-topic-summary] Gemini AI initialized');
  } else {
    winston.warn('[plugin/ai-topic-summary] Gemini API key not configured');
  }

  // Admin routes
  router.get('/admin/plugins/ai-topic-summary', middleware.admin.buildHeader, renderAdminPage);
  router.get('/api/admin/plugins/ai-topic-summary', renderAdminPage);
  
  
  // Register WebSocket handlers
  const sockets = require.main.require('./src/socket.io/plugins');
  sockets.aiTopicSummary = {};
  
  // Save settings via WebSocket
  sockets.aiTopicSummary.saveSettings = async function (socket, data) {
    if (!socket.uid) {
      throw new Error('[[error:not-logged-in]]');
    }
    
    const isAdmin = await user.isAdministrator(socket.uid);
    if (!isAdmin) {
      throw new Error('[[error:no-privileges]]');
    }
    
    await meta.settings.set('ai-topic-summary', data);
    
    // Reinitialize Gemini AI if API key changed
    if (data.geminiApiKey) {
      genAI = new GoogleGenAI({apiKey: data.geminiApiKey});
      winston.info('[plugin/ai-topic-summary] Gemini AI reinitialized with new API key');
    }
    
    return { success: true };
  };
  
  // Test connection via WebSocket
  sockets.aiTopicSummary.testConnection = async function (socket, data) {
    if (!socket.uid) {
      throw new Error('[[error:not-logged-in]]');
    }
    
    const isAdmin = await user.isAdministrator(socket.uid);
    if (!isAdmin) {
      throw new Error('[[error:no-privileges]]');
    }
    
    if (!data.apiKey) {
      throw new Error('API key is required');
    }
    
    try {
      // Test the API key
      const testGenAI = new GoogleGenAI({apiKey: data.apiKey});
      const result = await testGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Hello'
      });
      
      if (result.text) {
        return { success: true };
      } else {
        throw new Error('Failed to connect to Gemini API');
      }
    } catch (err) {
      winston.error('[plugin/ai-topic-summary] Error testing connection:', err);
      throw new Error('Invalid API key or connection failed');
    }
  };
  
  // Get summary via WebSocket
  sockets.aiTopicSummary.getSummary = async function (socket, data) {
    if (!socket.uid) {
      throw new Error('[[error:not-logged-in]]');
    }
    
    const tid = parseInt(data.tid, 10);
    if (!tid) {
      throw new Error('Invalid topic ID');
    }
    
    // Check read permissions
    const canRead = await privileges.topics.can('topics:read', tid, socket.uid);
    if (!canRead) {
      throw new Error('[[error:no-privileges]]');
    }
    
    const summary = await getSummaryFromDB(tid);
    if (!summary) {
      throw new Error('Summary not found');
    }
    
    return summary;
  };
};

// Hook: Add admin menu
plugin.addAdminMenu = async function (header) {
  header.plugins.push({
    route: '/plugins/ai-topic-summary',
    icon: 'fa-robot',
    name: 'AI Topic Summary'
  });
  return header;
};

// Hook: Post creation - trigger summary generation
plugin.onPostCreate = async function (data) {
  try {
    const { post } = data;
    winston.info(`[plugin/ai-topic-summary] onPostCreate triggered for post ${post?.pid} in topic ${post?.tid}`);
    if (!post || !post.tid) return data;

    // Get topic post count
    const topicData = await topics.getTopicData(post.tid);
    if (!topicData || !topicData.postcount) return data;

    // Get trigger count from settings
    const settings = await meta.settings.get('ai-topic-summary');
    if (!settings || !settings.triggerCount) {
      winston.error('[plugin/ai-topic-summary] Settings not configured properly');
      return data;
    }
    const triggerCount = parseInt(settings.triggerCount, 10);
    
    // Check if we should generate summary
    if (topicData.postcount % triggerCount === 0) {
      winston.info(`[plugin/ai-topic-summary] *** SUMMARY TRIGGER HIT *** Topic ${post.tid} has ${topicData.postcount} posts (trigger: every ${triggerCount} posts)`);
      
      // Generate summary in background
      process.nextTick(() => {
        winston.info(`[plugin/ai-topic-summary] Starting background summary generation for topic ${post.tid}`);
        generateSummary(post.tid)
          .then(summary => {
            if (summary) {
              winston.info(`[plugin/ai-topic-summary] Summary generated successfully for topic ${post.tid}`);
            } else {
              winston.warn(`[plugin/ai-topic-summary] Summary generation returned null for topic ${post.tid}`);
            }
          })
          .catch(err => {
            winston.error('[plugin/ai-topic-summary] Error generating summary:', err);
          });
      });
    } else {
      winston.info(`[plugin/ai-topic-summary] Not generating summary - post count ${topicData.postcount} not divisible by ${triggerCount}`);
    }

    return data;
  } catch (err) {
    winston.error('[plugin/ai-topic-summary] Error in onPostCreate:', err);
    return data;
  }
};

// Hook: Topic get - inject summary data
plugin.onTopicGet = async function (data) {
  try {
    const { topic } = data;
    winston.info(`[plugin/ai-topic-summary] onTopicGet triggered for topic ${topic?.tid}`);
    if (!topic || !topic.tid) return data;

    // Get existing summary
    const summary = await getSummaryFromDB(topic.tid);
    if (summary) {
      winston.info(`[plugin/ai-topic-summary] Found existing summary for topic ${topic.tid}`);
      topic.aiSummary = {
        text: summary.summaryText,
        postCount: summary.postCount,
        generatedAt: summary.generatedAt,
        aiModel: summary.aiModel
      };
      winston.info(`[plugin/ai-topic-summary] Attached summary to topic data:`, topic.aiSummary);
    } else {
      winston.info(`[plugin/ai-topic-summary] No summary found for topic ${topic.tid}`);
    }

    return data;
  } catch (err) {
    winston.error('[plugin/ai-topic-summary] Error in onTopicGet:', err);
    return data;
  }
};

// Target languages (20)
const LANG_KEYS = [
  'en','zh-CN','hi','es','ar','fr','bn','ru','pt','ur',
  'id','de','ja','fil','tr','ko','fa','sw','ha','it',
];

// Generate AI summary for a topic (multi-language, strict — no fallbacks)
async function generateSummary(tid) {
  winston.info(`[plugin/ai-topic-summary] generateSummary called for topic ${tid}`);
  try {
    if (!genAI) {
      winston.warn('[plugin/ai-topic-summary] Gemini AI not initialized');
      return null;
    }

    // Get topic posts
    const posts = await getTopicPosts(tid);
    if (!posts || posts.length === 0) {
      winston.warn(`[plugin/ai-topic-summary] No posts found for topic ${tid}`);
      return null;
    }

    // Prepare content for AI
    const content = posts.map(post => post.content).join('\n\n');
    if (!content.trim()) {
      winston.warn(`[plugin/ai-topic-summary] No content to summarize for topic ${tid}`);
      return null;
    }

    // Generate summary prompt (expects strict JSON)
    const prompt = createMultiLangSummaryPrompt(content, LANG_KEYS);

    const settings = await meta.settings.get('ai-topic-summary');
    if (!settings || !settings.aiModel) {
      winston.error('[plugin/ai-topic-summary] AI model not configured');
      return null;
    }
    const modelName = settings.aiModel;
    const result = await genAI.models.generateContent({ model: modelName, contents: prompt });
    const raw = result && result.text;
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      throw new Error('Empty summary response');
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      winston.error('[plugin/ai-topic-summary] Failed to parse JSON summary', { raw: raw.substring(0, 300) });
      throw new Error('Invalid JSON from summarizer');
    }
    // Validate structure: { original: string, translations: Record<lang,string> }
    if (!parsed || typeof parsed !== 'object' || typeof parsed.original !== 'string' || !parsed.translations || typeof parsed.translations !== 'object') {
      throw new Error('Invalid summary object shape');
    }
    // Validate all languages present and non-empty
    for (const lang of LANG_KEYS) {
      const v = parsed.translations[lang];
      if (typeof v !== 'string' || !v.trim()) {
        throw new Error(`Missing or empty summary for ${lang}`);
      }
    }

    // Persist: original + translations (+ legacy summaryText for backward compatibility)
    const summary = {
      topicId: tid,
      summaryText: parsed.original, // legacy field (used by current UI)
      original: parsed.original,
      translations: parsed.translations,
      postCount: posts.length,
      generatedAt: Date.now(),
      aiModel: modelName,
    };

    await saveSummaryToDBStrict(summary);
    
    winston.info(`[plugin/ai-topic-summary] *** SUMMARY SAVED *** Topic ${tid} (${posts.length} posts) - Summary: ${summaryText.substring(0, 100)}...`);
    return summary;
  } catch (err) {
    winston.error(`[plugin/ai-topic-summary] Error generating summary for topic ${tid}:`, err);
    return null;
  }
}

// Get topic posts (excluding deleted and moderation queue)
async function getTopicPosts(tid) {
  try {
    const topicPosts = await topics.getTopicPosts(tid, 'tid:' + tid + ':posts', 0, -1, false);
    
    return topicPosts.filter(post => {
      return post && 
             !post.deleted &&
             post.content &&
             post.content.trim().length > 0;
    });
  } catch (err) {
    winston.error(`[plugin/ai-topic-summary] Error getting posts for topic ${tid}:`, err);
    return [];
  }
}

// Create strict JSON prompt for multi-language summary
function createMultiLangSummaryPrompt(content, langs) {
  const keys = JSON.stringify(langs);
  return [
    'You are a professional summarizer. Summarize the following discussion and return STRICT JSON only.',
    'JSON shape: { "original": string, "translations": { <lang>: string } }',
    `Languages (exact keys): ${keys}`,
    '- No commentary, no markdown, no code fences. JSON only.',
    '- The "original" must be a high-quality summary in the content\'s language.',
    '- Each translations[lang] must be a high-quality summary in that language. No empty values.',
    '- Keep each summary concise (3-6 sentences).',
    '',
    'Content:',
    content,
  ].join('\n');
}

// Database operations
async function saveSummaryToDBStrict(summary) {
  const key = 'aiTopicSummary:' + summary.topicId;
  const payload = {
    summaryText: summary.summaryText, // legacy
    original: summary.original,
    translations: summary.translations,
    postCount: summary.postCount,
    generatedAt: summary.generatedAt,
    aiModel: summary.aiModel,
  };
  // Ensure all translations persisted
  await database.setObject(key, payload);
  const saved = await database.getObject(key);
  if (!saved || !saved.translations) {
    throw new Error('Failed to persist summary translations');
  }
  for (const lang of LANG_KEYS) {
    const v = saved.translations[lang];
    if (typeof v !== 'string' || !v.trim()) {
      throw new Error(`Translation not persisted for ${lang}`);
    }
  }
}

async function getSummaryFromDB(tid) {
  try {
    const key = 'aiTopicSummary:' + tid;
    const summary = await database.getObject(key);
    return summary && (summary.summaryText || summary.original) ? summary : null;
  } catch (err) {
    winston.error(`[plugin/ai-topic-summary] Error getting summary for topic ${tid}:`, err);
    return null;
  }
}

// API endpoints
async function renderAdminPage(req, res) {
  const settings = await meta.settings.get('ai-topic-summary');
  
  res.render('admin/plugins/ai-topic-summary', {
    settings: settings || {}
  });
}
