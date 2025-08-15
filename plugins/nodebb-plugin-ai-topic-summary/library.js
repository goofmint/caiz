'use strict';

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');
const database = require.main.require('./src/database');
const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const user = require.main.require('./src/user');
const privileges = require.main.require('./src/privileges');
const meta = require.main.require('./src/meta');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const plugin = module.exports;

// Initialize Gemini AI
let genAI;

plugin.onAppLoad = async function (params) {
  const { app, router, middleware } = params;

  // Initialize Gemini AI
  const apiKey = await meta.settings.get('ai-topic-summary');
  if (apiKey && apiKey.geminiApiKey) {
    genAI = new GoogleGenerativeAI(apiKey.geminiApiKey);
    winston.info('[plugin/ai-topic-summary] Gemini AI initialized');
  }

  // Admin routes
  router.get('/admin/plugins/ai-topic-summary', middleware.admin.buildHeader, renderAdminPage);
  router.get('/api/admin/plugins/ai-topic-summary', renderAdminPage);
  
  // API routes
  router.post('/api/v3/plugins/ai-topic-summary/settings', middleware.requireUser, middleware.admin.requireAdminOrGlobalMod, saveSettings);
  router.post('/api/v3/plugins/ai-topic-summary/generate/:tid', middleware.requireUser, generateSummaryManual);
  router.get('/api/v3/plugins/ai-topic-summary/:tid', middleware.requireUser, getSummary);
};

// Hook: Post creation - trigger summary generation
plugin.onPostCreate = async function (data) {
  try {
    const { post } = data;
    if (!post || !post.tid) return data;

    // Get topic post count
    const topicData = await topics.getTopicData(post.tid);
    if (!topicData || !topicData.postcount) return data;

    // Check if we should generate summary (every 10 posts)
    if (topicData.postcount % 10 === 0) {
      winston.info(`[plugin/ai-topic-summary] Triggering summary generation for topic ${post.tid} (${topicData.postcount} posts)`);
      
      // Generate summary in background
      process.nextTick(() => {
        generateSummary(post.tid).catch(err => {
          winston.error('[plugin/ai-topic-summary] Error generating summary:', err);
        });
      });
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
    if (!topic || !topic.tid) return data;

    // Get existing summary
    const summary = await getSummaryFromDB(topic.tid);
    if (summary) {
      topic.aiSummary = {
        text: summary.summaryText,
        postCount: summary.postCount,
        generatedAt: summary.generatedAt,
        aiModel: summary.aiModel
      };
    }

    return data;
  } catch (err) {
    winston.error('[plugin/ai-topic-summary] Error in onTopicGet:', err);
    return data;
  }
};

// Generate AI summary for a topic
async function generateSummary(tid) {
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

    // Detect language and generate summary
    const language = detectLanguage(content);
    const prompt = createSummaryPrompt(content, language);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const summaryText = result.response.text();

    if (!summaryText) {
      winston.warn(`[plugin/ai-topic-summary] Empty summary generated for topic ${tid}`);
      return null;
    }

    // Save summary to database
    const summary = {
      topicId: tid,
      summaryText: summaryText,
      postCount: posts.length,
      generatedAt: Date.now(),
      aiModel: 'gemini-1.5-flash'
    };

    await saveSummaryToDB(summary);
    
    winston.info(`[plugin/ai-topic-summary] Generated summary for topic ${tid} (${posts.length} posts)`);
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

// Detect content language (simple heuristic)
function detectLanguage(content) {
  // Simple Japanese detection - look for Hiragana/Katakana/Kanji characters
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(content) ? 'ja' : 'en';
}

// Create summary prompt based on language
function createSummaryPrompt(content, language) {
  const prompts = {
    ja: `以下の議論の流れを簡潔にまとめてください。重要なポイントや議論の結論があれば含めてください。個人名やユーザー名は除外してください。

内容:
${content}

要約:`,
    en: `Please provide a concise summary of the following discussion. Include important points and conclusions if any. Exclude personal names or usernames.

Content:
${content}

Summary:`
  };

  return prompts[language] || prompts.en;
}

// Database operations
async function saveSummaryToDB(summary) {
  const key = 'aiTopicSummary:' + summary.topicId;
  await database.setObject(key, {
    summaryText: summary.summaryText,
    postCount: summary.postCount,
    generatedAt: summary.generatedAt,
    aiModel: summary.aiModel
  });
}

async function getSummaryFromDB(tid) {
  try {
    const key = 'aiTopicSummary:' + tid;
    const summary = await database.getObject(key);
    return summary && summary.summaryText ? summary : null;
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

async function saveSettings(req, res) {
  try {
    const settings = req.body;
    await meta.settings.set('ai-topic-summary', settings);
    
    // Reinitialize Gemini AI if API key changed
    if (settings.geminiApiKey) {
      genAI = new GoogleGenerativeAI(settings.geminiApiKey);
      winston.info('[plugin/ai-topic-summary] Gemini AI reinitialized with new API key');
    }
    
    res.json({ success: true });
  } catch (err) {
    winston.error('[plugin/ai-topic-summary] Error saving settings:', err);
    res.status(500).json({ error: err.message });
  }
}

async function generateSummaryManual(req, res) {
  try {
    const tid = parseInt(req.params.tid, 10);
    if (!tid) {
      return res.status(400).json({ error: 'Invalid topic ID' });
    }

    // Check permissions
    const canModerate = await privileges.topics.canModerate(tid, req.uid);
    if (!canModerate) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const summary = await generateSummary(tid);
    if (!summary) {
      return res.status(500).json({ error: 'Failed to generate summary' });
    }

    res.json(summary);
  } catch (err) {
    winston.error('[plugin/ai-topic-summary] Error in manual summary generation:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getSummary(req, res) {
  try {
    const tid = parseInt(req.params.tid, 10);
    if (!tid) {
      return res.status(400).json({ error: 'Invalid topic ID' });
    }

    // Check read permissions
    const canRead = await privileges.topics.can('topics:read', tid, req.uid);
    if (!canRead) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const summary = await getSummaryFromDB(tid);
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json(summary);
  } catch (err) {
    winston.error('[plugin/ai-topic-summary] Error getting summary:', err);
    res.status(500).json({ error: err.message });
  }
}