'use strict';

const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const privileges = require.main.require('./src/privileges');
const socketPlugins = require.main.require('./src/socket.io/plugins');

const SettingsManager = require('./lib/config/settings');
const PromptManager = require('./lib/translation/prompt-manager');
const GeminiApiClient = require('./lib/translation/api-client');

const plugin = {
    settingsManager: null,
    promptManager: null,
    apiClient: null
};


/**
 * Plugin initialization
 */
plugin.init = async function(params) {
    const { router, middleware } = params;
    
    winston.info('[auto-translate] Initializing Auto Translate Plugin');
    
    // Initialize managers
    plugin.settingsManager = new SettingsManager();
    plugin.promptManager = new PromptManager();
    plugin.apiClient = new GeminiApiClient();
    
    // Load initial settings
    await plugin.settingsManager.init();
    
    // Initialize API client with settings
    const settings = await plugin.settingsManager.getRawSettings();
    if (settings.api && settings.api.geminiApiKey) {
        plugin.apiClient.initialize(settings);
    }
    
    // Setup admin routes
    setupAdminRoutes(router, middleware);
    
    // Setup socket handlers
    setupSocketHandlers();
    
    winston.info('[auto-translate] Plugin initialized successfully');
};

/**
 * Hook: Filter middleware render header - set language variables for header template
 */
plugin.filterMiddlewareRenderHeader = async function(data) {
    try {
        const { req, res, templateData } = data;
        
        winston.info('[auto-translate] filterMiddlewareRenderHeader called', {
            hasReq: !!req,
            hasRes: !!res,
            hasTemplateData: !!templateData,
            url: req ? req.url : 'no-url'
        });
        
        if (!req || !templateData) {
            return data;
        }
        
        // 言語を検出
        const currentLang = await detectLanguage(req);
        const lang = currentLang || 'ja';
        
        // templateDataに直接設定（headerテンプレート用）
        templateData.seoLang = lang;
        templateData.userLang = lang;
        templateData.hreflangs = generateHreflangs(req);
        templateData.languageSwitcher = await generateLanguageSwitcherData(req, lang);
        
        winston.info('[auto-translate] Set header template variables', {
            seoLang: lang,
            userLang: lang,
            hreflangCount: templateData.hreflangs ? templateData.hreflangs.length : 0,
            hasLanguageSwitcher: !!templateData.languageSwitcher,
            languageSwitcherData: templateData.languageSwitcher ? {
                code: templateData.languageSwitcher.code,
                name: templateData.languageSwitcher.name,
                languageCount: templateData.languageSwitcher.languages ? templateData.languageSwitcher.languages.length : 0
            } : null,
            url: req.url,
            currentLang: currentLang
        });
        
    } catch (err) {
        winston.error('[auto-translate] Failed in filterMiddlewareRenderHeader:', err);
    }
    
    return data;
};

/**
 * Add admin navigation menu
 */
plugin.addAdminMenu = function(header, callback) {
    header.plugins.push({
        route: '/plugins/auto-translate',
        icon: 'fa-language',
        name: '[[auto-translate:auto-translate]]'
    });
    
    callback(null, header);
};

/**
 * Setup admin routes
 */
function setupAdminRoutes(router, middleware) {
    router.get('/admin/plugins/auto-translate', middleware.admin.buildHeader, renderAdmin);
    router.get('/api/admin/plugins/auto-translate', renderAdmin);
}

/**
 * Render admin page
 */
function renderAdmin(req, res) {
    res.render('admin/plugins/auto-translate', {
        title: '[[auto-translate:admin.title]]'
    });
}

/**
 * Setup socket handlers for admin
 */
function setupSocketHandlers() {
    const sockets = require.main.require('./src/socket.io/plugins');
    sockets.autoTranslate = {};
    
    // Get current settings
    sockets.autoTranslate.getSettings = async function(socket, data) {
        await requireAdmin(socket);
        
        try {
            const settings = await plugin.settingsManager.getSettings();
            return settings;
        } catch (err) {
            winston.error('[auto-translate] Failed to get settings:', err);
            throw err;
        }
    };
    
    // Save settings
    sockets.autoTranslate.saveSettings = async function(socket, data) {
        await requireAdmin(socket);
        
        try {
            await plugin.settingsManager.saveSettings(data);
            winston.info('[auto-translate] Settings saved by uid:', socket.uid);
            return { success: true };
        } catch (err) {
            winston.error('[auto-translate] Failed to save settings:', err);
            throw err;
        }
    };
    
    // Test API connection
    sockets.autoTranslate.testConnection = async function(socket, data) {
        await requireAdmin(socket);
        
        let apiKey = data.apiKey;
        
        // If useSavedKey is true, get the saved API key
        if (data.useSavedKey && !apiKey) {
            const settings = await plugin.settingsManager.getRawSettings();
            if (settings.api && settings.api.geminiApiKey) {
                apiKey = settings.api.geminiApiKey;
            }
        }
        
        winston.info('[auto-translate] Test connection called with data:', { 
            hasApiKey: !!apiKey, 
            apiKeyLength: apiKey ? apiKey.length : 0,
            apiKeyPrefix: apiKey ? apiKey.substring(0, 6) + '...' : 'none',
            useSavedKey: !!data.useSavedKey
        });
        
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        try {
            const result = await plugin.apiClient.testConnection(apiKey);
            return result;
        } catch (err) {
            winston.error('[auto-translate] API test failed:', err);
            throw err;
        }
    };
    
    // Get translations for content
    sockets.autoTranslate.getTranslations = async function(socket, data) {
        try {
            const { type, id } = data;
            
            if (!type || !id) {
                throw new Error('Type and ID are required');
            }
            
            const translationKey = `auto-translate:${type}:${id}`;
            const translations = await db.getObject(translationKey);
            
            return translations || null;
        } catch (err) {
            winston.error('[auto-translate] Failed to get translations:', err);
            throw err;
        }
    };
    
    // Get original content for display
    sockets.autoTranslate.getOriginal = async function(socket, data) {
        try {
            const { type, id } = data;
            
            winston.info('[auto-translate] getOriginal called:', { type, id, uid: socket.uid });
            
            if (!type || !id) {
                throw new Error('Type and ID are required');
            }
            
            const translationKey = `auto-translate:${type}:${id}`;
            const translationData = await db.getObject(translationKey);
            
            winston.info('[auto-translate] Translation data retrieved:', {
                key: translationKey,
                hasData: !!translationData,
                hasOriginal: translationData && !!translationData.original,
                originalLength: translationData && translationData.original ? translationData.original.length : 0,
                dataKeys: translationData ? Object.keys(translationData) : []
            });
            
            if (!translationData || !translationData.original) {
                winston.warn('[auto-translate] No original content found for:', { type, id, translationKey });
                return null;
            }
            
            let originalContent = translationData.original;
            
            // 投稿の場合は原文をHTMLに変換
            if (type === 'post') {
                try {
                    const Posts = require.main.require('./src/posts');
                    
                    // postDataオブジェクトを作成
                    const postDataForParsing = {
                        pid: id,
                        content: originalContent,
                        sourceContent: originalContent,
                        uid: 1, // システムユーザー
                        tid: 1
                    };
                    
                    const parsedPostData = await Posts.parsePost(postDataForParsing, 'default');
                    originalContent = parsedPostData.content;
                    
                    winston.info('[auto-translate] Original content parsed to HTML:', {
                        type,
                        id,
                        originalLength: translationData.original.length,
                        parsedLength: originalContent.length
                    });
                } catch (parseErr) {
                    winston.error('[auto-translate] Failed to parse original content:', parseErr);
                    // パースに失敗した場合は生のテキストを使用
                }
            } else if (type === 'topic') {
                // トピックタイトルの場合はMarkdown記号を除去
                originalContent = cleanMarkdownTitle(originalContent);
            }
            
            return { original: originalContent };
        } catch (err) {
            winston.error('[auto-translate] Failed to get original content:', err);
            throw err;
        }
    };
    
    winston.info('[auto-translate] Socket handlers registered');
}

/**
 * Hook: After post save
 */
plugin.onPostSave = async function(data) {
    try {
        const { post } = data;
        
        winston.info('[auto-translate] Post save hook triggered', { 
            pid: post.pid, 
            content: post.content ? post.content.substring(0, 50) + '...' : 'empty'
        });
        
        // Check if translation is enabled and API is available
        const settings = await plugin.settingsManager.getRawSettings();
        if (!settings.api || !settings.api.geminiApiKey) {
            winston.info('[auto-translate] No API key configured, skipping translation');
            return data;
        }
        
        // Skip if content is too short or empty
        if (!post.content || post.content.length < 10) {
            winston.info('[auto-translate] Content too short, skipping translation');
            return data;
        }
        
        winston.info('[auto-translate] Translating post:', { pid: post.pid });
        
        // Perform translation
        const translations = await translateAndSaveContent('post', post.pid, post.content, settings);

        // Index to Elasticsearch via caiz-elastic plugin (direct call; no fallbacks)
        try {
            const elastic = require('../nodebb-plugin-caiz-elastic/library');
            await elastic.indexPost({ post, translations });
            winston.info('[auto-translate] Indexed post into Elasticsearch', { pid: post.pid });
        } catch (e) {
            winston.error('[auto-translate] Failed to index post into Elasticsearch', { pid: post.pid, error: e.message });
        }
        
    } catch (err) {
        winston.error('[auto-translate] Failed to translate post:', err);
        // Don't fail the post creation if translation fails
    }
    
    return data;
};

/**
 * Hook: After topic save
 */
plugin.onTopicSave = async function(data) {
    try {
        const { topic } = data;
        
        winston.info('[auto-translate] Topic save hook triggered', { 
            tid: topic.tid, 
            title: topic.title ? topic.title.substring(0, 50) + '...' : 'empty'
        });
        
        // Check if translation is enabled and API is available
        const settings = await plugin.settingsManager.getRawSettings();
        if (!settings.api || !settings.api.geminiApiKey) {
            winston.info('[auto-translate] No API key configured, skipping translation');
            return data;
        }
        
        // Skip if title is too short or empty
        if (!topic.title || topic.title.length < 5) {
            winston.info('[auto-translate] Title too short, skipping translation');
            return data;
        }
        
        winston.info('[auto-translate] Translating topic:', { tid: topic.tid });
        
        // Format title as Markdown heading for better translation context
        const markdownTitle = `# ${topic.title}`;
        
        // Perform translation
        const translations = await translateAndSaveContent('topic', topic.tid, markdownTitle, settings);

        // Index to Elasticsearch via caiz-elastic plugin (direct call; no fallbacks)
        try {
            const elastic = require('../nodebb-plugin-caiz-elastic/library');
            await elastic.indexTopic({ topic, translations });
            winston.info('[auto-translate] Indexed topic into Elasticsearch', { tid: topic.tid });
        } catch (e) {
            winston.error('[auto-translate] Failed to index topic into Elasticsearch', { tid: topic.tid, error: e.message });
        }
        
    } catch (err) {
        winston.error('[auto-translate] Failed to translate topic:', err);
        // Don't fail the topic creation if translation fails
    }
    
    return data;
};

/**
 * Hook: After post edit — re-translate if content changed (no fallbacks)
 */
plugin.onPostEdit = async function (data) {
    try {
        const post = data && data.post;
        if (!post || !post.pid) {
            winston.warn('[auto-translate] onPostEdit called without post payload');
            return data;
        }

        const settings = await plugin.settingsManager.getRawSettings();
        if (!settings || !settings.api || !settings.api.geminiApiKey) {
            winston.error('[auto-translate] Missing API settings on edit; aborting re-translation', { pid: post.pid });
            return data;
        }

        const content = String(post.content || '');
        if (content.length < 10) {
            winston.info('[auto-translate] Edited content too short; skip re-translation', { pid: post.pid, length: content.length });
            return data;
        }

        const key = `auto-translate:post:${post.pid}`;
        const existing = await db.getObject(key);
        const previousOriginal = existing && typeof existing.original === 'string' ? existing.original : null;

        const changed = !previousOriginal || previousOriginal !== content;
        winston.info('[auto-translate] Post edit diff check', {
            pid: post.pid,
            hadPrevious: !!previousOriginal,
            changed
        });

        if (!changed) {
            winston.info('[auto-translate] Post content unchanged; skip re-translation', { pid: post.pid });
            return data;
        }

        await translateAndSaveContent('post', post.pid, content, settings);
        winston.info('[auto-translate] Re-translation completed for edited post', { pid: post.pid });
    } catch (err) {
        winston.error('[auto-translate] Failed to re-translate edited post', { error: err.message, stack: err.stack });
    }
    return data;
};

/**
 * Hook: After topic edit — re-translate if title changed (no fallbacks)
 */
plugin.onTopicEdit = async function (data) {
    try {
        const topic = data && data.topic;
        if (!topic || !topic.tid) {
            winston.warn('[auto-translate] onTopicEdit called without topic payload');
            return data;
        }

        const settings = await plugin.settingsManager.getRawSettings();
        if (!settings || !settings.api || !settings.api.geminiApiKey) {
            winston.error('[auto-translate] Missing API settings on topic edit; aborting re-translation', { tid: topic.tid });
            return data;
        }

        const title = String(topic.title || '');
        if (title.length < 5) {
            winston.info('[auto-translate] Edited title too short; skip re-translation', { tid: topic.tid, length: title.length });
            return data;
        }

        const markdownTitle = `# ${title}`;
        const key = `auto-translate:topic:${topic.tid}`;
        const existing = await db.getObject(key);
        const previousOriginal = existing && typeof existing.original === 'string' ? existing.original : null;
        const changed = !previousOriginal || previousOriginal !== markdownTitle;

        winston.info('[auto-translate] Topic edit diff check', {
            tid: topic.tid,
            hadPrevious: !!previousOriginal,
            changed
        });

        if (!changed) {
            winston.info('[auto-translate] Topic title unchanged; skip re-translation', { tid: topic.tid });
            return data;
        }

        await translateAndSaveContent('topic', topic.tid, markdownTitle, settings);
        winston.info('[auto-translate] Re-translation completed for edited topic', { tid: topic.tid });
    } catch (err) {
        winston.error('[auto-translate] Failed to re-translate edited topic', { error: err.message, stack: err.stack });
    }
    return data;
};

/**
 * Translate content and save to database
 */
async function translateAndSaveContent(type, id, content, settings) {
    try {
        winston.info('[auto-translate] Starting translation process', { type, id, contentLength: content.length });
        
        // Build translation prompt
        const prompt = plugin.promptManager.buildTranslationPrompt(content, settings);
        winston.info('[auto-translate] Translation prompt built', { type, id });
        
        // Call translation API
        winston.info('[auto-translate] Calling translation API', { type, id });
        const result = await plugin.apiClient.translateContent(prompt, settings);
        
        winston.info('[auto-translate] Translation API response received', { 
            type, 
            id, 
            success: result.success,
            hasTranslations: !!(result.translations),
            errorMessage: result.error
        });
        
        if (!result.success) {
            throw new Error(result.error || 'Translation failed');
        }
        
        // Save translations to database
        winston.info('[auto-translate] Saving translations to database', { type, id });
        const translationKey = `auto-translate:${type}:${id}`;
        await db.setObject(translationKey, {
            original: content,
            translations: result.translations,
            created: Date.now(),
            usage: result.usage
        });
        
        winston.info('[auto-translate] Saved translations successfully:', {
            type,
            id,
            languageCount: Object.keys(result.translations).length,
            key: translationKey
        });
        
        return result.translations;
    } catch (err) {
        winston.error('[auto-translate] Translation and save failed:', {
            type,
            id,
            error: err.message,
            stack: err.stack
        });
        throw err;
    }
}

/**
 * Hook: Add hreflang tags to link tags
 */
plugin.addHreflangTags = async function(data) {
    try {
        winston.info('[auto-translate] addHreflangTags hook called', {
            hasReq: !!data.req,
            hasLinks: !!data.links,
            linksCount: data.links ? data.links.length : 0
        });
        
        const { req, links } = data;
        
        if (!req) {
            winston.warn('[auto-translate] No request object in addHreflangTags');
            return data;
        }
        
        // 現在の言語を検出
        const currentLang = await detectLanguage(req);
        
        // hreflangリンクを生成
        const hreflangs = generateHreflangs(req);
        
        // linksにhreflangタグを追加
        hreflangs.forEach(hreflang => {
            const linkTag = {
                rel: 'alternate',
                hreflang: hreflang.lang,
                href: hreflang.url
            };
            data.links.push(linkTag);
            winston.verbose('[auto-translate] Added hreflang link', linkTag);
        });
        
        winston.info('[auto-translate] Added hreflang tags to link tags', {
            count: hreflangs.length,
            currentLang,
            totalLinks: data.links.length
        });
        
    } catch (err) {
        winston.error('[auto-translate] Failed to add hreflang tags:', err);
    }
    
    return data;
};

/**
 * Language display names map
 */
const LANGUAGE_NAMES = {
    "en": "English",
    "zh-CN": "中文(简体)",
    "hi": "हिन्दी",
    "es": "Español",
    "ar": "العربية",
    "fr": "Français",
    "bn": "বাংলা",
    "ru": "Русский",
    "pt": "Português",
    "ur": "اردو",
    "id": "Bahasa Indonesia",
    "de": "Deutsch",
    "ja": "Japanese",
    "fil": "Filipino",
    "tr": "Türkçe",
    "ko": "한국어",
    "fa": "فارسی",
    "sw": "Kiswahili",
    "ha": "Hausa",
    "it": "Italiano"
};

/**
 * Get translated language names using user's language settings
 */
async function getTranslatedLanguageNames(userLang) {
    const translator = require.main.require('./src/translator');
    const LANG_KEYS = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                       "id","de","ja","fil","tr","ko","fa","sw","ha","it"];
    
    const translatedNames = {};
    
    for (const langKey of LANG_KEYS) {
        const translatedName = await translator.translate(`[[auto-translate:languages.${langKey}]]`, userLang);
        translatedNames[langKey] = translatedName;
    }
    
    return translatedNames;
}

/**
 * Generate language switcher data for dropdown
 */
async function generateLanguageSwitcherData(req, currentLang) {
    const LANG_KEYS = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                       "id","de","ja","fil","tr","ko","fa","sw","ha","it"];
    
    // ユーザーの言語設定を取得
    let userDisplayLang = 'en-GB'; // デフォルト
    if (req.uid) {
        try {
            const User = require.main.require('./src/user');
            const userSettings = await User.getSettings(req.uid);
            userDisplayLang = userSettings.userLang || userSettings.language || 'en-GB';
        } catch (err) {
            winston.error('[auto-translate] Failed to get user display language:', err);
        }
    }
    
    // ユーザーの表示言語で翻訳された言語名を取得
    const translatedNames = await getTranslatedLanguageNames(userDisplayLang);
    
    // 現在のURLを構築（クエリパラメータを含む）
    const protocol = req.protocol || 'https';
    const host = req.get('host');
    const path = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const baseUrl = `${protocol}://${host}${path}`;
    
    // 各言語の切替リンクを生成
    const languages = LANG_KEYS.map(langKey => {
        const url = new URL(baseUrl);
        
        // 既存のクエリパラメータを保持
        if (req.query) {
            Object.keys(req.query).forEach(key => {
                if (key !== 'locale' && key !== 'lang') {
                    url.searchParams.set(key, req.query[key]);
                }
            });
        }
        url.searchParams.set('locale', langKey);
        
        return {
            code: langKey,
            name: translatedNames[langKey] || langKey,
            url: url.href,
            active: langKey === currentLang
        };
    });
    
    const currentLanguageData = {
        code: currentLang,
        name: translatedNames[currentLang] || currentLang,
        languages: languages
    };
    
    winston.info('[auto-translate] Generated language switcher data', {
        currentLang,
        currentName: currentLanguageData.name,
        languageCount: languages.length,
        activeLanguages: languages.filter(l => l.active).map(l => l.code),
        requestUrl: baseUrl
    });
    
    return currentLanguageData;
}

/**
 * Generate hreflang links for all supported languages
 */
function generateHreflangs(req) {
    const LANG_KEYS = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                       "id","de","ja","fil","tr","ko","fa","sw","ha","it"];
    
    // 現在のURLを構築（クエリパラメータを含む）
    const protocol = req.protocol || 'https';
    const host = req.get('host');
    const path = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const baseUrl = `${protocol}://${host}${path}`;
    
    // 各言語のhrefリンクを生成
    const hreflangs = LANG_KEYS.map(langKey => {
        const url = new URL(baseUrl);
        // 既存のクエリパラメータを保持
        if (req.query) {
            Object.keys(req.query).forEach(key => {
                if (key !== 'locale' && key !== 'lang') {
                    url.searchParams.set(key, req.query[key]);
                }
            });
        }
        url.searchParams.set('locale', langKey);
        
        return {
            lang: langKey,
            url: url.href
        };
    });
    
    // デフォルト言語（x-default）も追加
    hreflangs.push({
        lang: 'x-default',
        url: baseUrl
    });
    
    winston.verbose('[auto-translate] Generated hreflangs', {
        count: hreflangs.length,
        baseUrl,
        path,
        languages: LANG_KEYS
    });
    
    return hreflangs;
}

/**
 * Hook: Filter category topics get with translation
 */
plugin.filterCategoryTopicsGet = async function(data) {
    try {
        const { cid, topics, uid } = data;
        
        if (!topics || !Array.isArray(topics)) {
            return data;
        }
        
        // uidからユーザーの言語設定を取得
        const User = require.main.require('./src/user');
        const userSettings = await User.getSettings(uid);
        const userLang = userSettings.userLang || userSettings.language;
        const targetLang = normalizeBrowserLanguage(userLang);
        
        if (!targetLang || !isSupportedLanguage(targetLang)) {
            return data;
        }
        
        winston.info('[auto-translate] Applying translation to category topic list', { 
            cid,
            targetLang,
            topicCount: topics.length,
            uid
        });
        
        // トピック一覧のタイトルを翻訳
        for (const topic of topics) {
            if (topic.tid) {
                const translations = await getTranslations('topic', topic.tid);
                if (translations && translations.translations && translations.translations[targetLang]) {
                    const translatedTitle = cleanMarkdownTitle(translations.translations[targetLang]);
                    topic.title = translatedTitle;
                    topic.titleRaw = translatedTitle;
                    
                    winston.verbose('[auto-translate] Category topic title translated', {
                        tid: topic.tid,
                        lang: targetLang,
                        originalTitle: topic.title,
                        translatedTitle
                    });
                }
            }
        }
        
    } catch (err) {
        winston.error('[auto-translate] Failed to apply translation to category topics:', err);
        // フィルターエラーでレンダリングを止めない
    }
    
    return data;
};

/**
 * Hook: Filter homepage with topic list translation
 */
plugin.filterHomepageBuild = async function(data) {
    try {
        const { req, templateData } = data;
        
        // 言語を検出
        const targetLang = await detectLanguage(req);
        if (!targetLang) {
            return data;
        }
        
        winston.info('[auto-translate] Applying translation to homepage topic list', { 
            targetLang,
            hasTopics: !!(templateData.topics)
        });
        
        // トピック一覧のタイトルを翻訳
        if (templateData.topics && Array.isArray(templateData.topics)) {
            for (const topic of templateData.topics) {
                if (topic.tid) {
                    const translations = await getTranslations('topic', topic.tid);
                    if (translations && translations.translations && translations.translations[targetLang]) {
                        const translatedTitle = cleanMarkdownTitle(translations.translations[targetLang]);
                        topic.title = translatedTitle;
                        topic.titleRaw = translatedTitle;
                        
                        winston.verbose('[auto-translate] Homepage topic title translated', {
                            tid: topic.tid,
                            lang: targetLang,
                            original: topic.title,
                            translated: translatedTitle
                        });
                    }
                }
            }
        }
        
    } catch (err) {
        winston.error('[auto-translate] Failed to apply translation to homepage:', err);
        // フィルターエラーでレンダリングを止めない
    }
    
    return data;
};

/**
 * Hook: Filter topic data before rendering
 */
plugin.filterTopicBuild = async function(data) {
    try {
        const { req, templateData } = data;
        
        // 言語を検出（async関数に変更）
        const targetLang = await detectLanguage(req);
        if (!targetLang) {
            return data;
        }
        
        winston.info('[auto-translate] Applying server-side translation', { 
            tid: templateData.tid, 
            targetLang 
        });
        
        // トピックタイトルの翻訳を適用
        if (templateData.tid) {
            const translations = await getTranslations('topic', templateData.tid);
            if (translations && translations.translations && translations.translations[targetLang]) {
                const translatedTitle = cleanMarkdownTitle(translations.translations[targetLang]);
                templateData.title = translatedTitle;
                templateData.titleRaw = translatedTitle;
                
                winston.info('[auto-translate] Server-side title translation applied', {
                    original: templateData.title,
                    translated: translatedTitle,
                    lang: targetLang
                });
            }
        }
        
        // 投稿内容の翻訳を適用
        if (templateData.posts && Array.isArray(templateData.posts)) {
            winston.info('[auto-translate] Processing posts for translation', {
                postCount: templateData.posts.length,
                targetLang,
                postIds: templateData.posts.map(p => p.pid)
            });
            
            for (const post of templateData.posts) {
                if (post.pid) {
                    const translations = await getTranslations('post', post.pid);
                    winston.info('[auto-translate] Translation check for post', {
                        pid: post.pid,
                        hasTranslations: !!translations,
                        hasTranslationsObject: !!(translations && translations.translations),
                        hasTargetLang: !!(translations && translations.translations && translations.translations[targetLang]),
                        availableLanguages: translations && translations.translations ? Object.keys(translations.translations) : [],
                        targetLang,
                        actualTargetLangValue: translations && translations.translations ? translations.translations[targetLang] : null,
                        targetLangType: translations && translations.translations && translations.translations[targetLang] ? typeof translations.translations[targetLang] : 'undefined'
                    });
                    
                    const translatedContent = translations && translations.translations && translations.translations[targetLang];
                    winston.info('[auto-translate] Translation condition check', {
                        pid: post.pid,
                        conditionMet: !!translatedContent,
                        translatedContentLength: translatedContent ? translatedContent.length : 0,
                        translatedContentPreview: translatedContent ? translatedContent.substring(0, 50) : 'none'
                    });
                    
                    if (translatedContent) {
                        
                        winston.info('[auto-translate] Applying translation to post', {
                            pid: post.pid,
                            targetLang,
                            originalContentLength: post.content ? post.content.length : 0,
                            translatedContentLength: translatedContent.length,
                            originalContentPreview: post.content ? post.content.substring(0, 100) : 'no content',
                            translatedContentPreview: translatedContent.substring(0, 100)
                        });
                        
                        try {
                            // 翻訳されたMarkdownコンテンツをHTMLに変換
                            const Posts = require.main.require('./src/posts');
                            
                            // 翻訳用の一意なキーを生成（キャッシュは言語別に分離）
                            const postDataForParsing = {
                                pid: `${post.pid}-${targetLang}`, // 言語別キャッシュキー
                                content: translatedContent,
                                sourceContent: translatedContent,
                                uid: post.uid,
                                tid: post.tid
                            };
                            
                            winston.info('[auto-translate] Parsing translated content with language-specific cache', {
                                pid: post.pid,
                                cacheKey: postDataForParsing.pid,
                                translatedContent: translatedContent.substring(0, 50)
                            });
                            
                            const parsedPostData = await Posts.parsePost(postDataForParsing);
                            
                            winston.info('[auto-translate] parsePost result with language cache', {
                                pid: post.pid,
                                cacheKey: postDataForParsing.pid,
                                inputContent: translatedContent.substring(0, 50),
                                outputContent: parsedPostData.content.substring(0, 100),
                                hasContent: !!parsedPostData.content
                            });
                            
                            // 翻訳されたHTMLコンテンツを設定
                            post.content = parsedPostData.content;
                            
                            winston.info('[auto-translate] Server-side post translation applied', {
                                pid: post.pid,
                                lang: targetLang,
                                originalLength: translatedContent.length,
                                parsedLength: post.content.length,
                                finalContentPreview: post.content.substring(0, 100)
                            });
                        } catch (parseErr) {
                            winston.error('[auto-translate] Failed to parse translated content:', {
                                pid: post.pid,
                                error: parseErr.message,
                                stack: parseErr.stack
                            });
                            // パースに失敗した場合は簡単なHTMLでラップ
                            post.content = `<p>${translatedContent}</p>`;
                            winston.info('[auto-translate] Applied fallback HTML wrapping', {
                                pid: post.pid,
                                lang: targetLang,
                                contentLength: translatedContent.length
                            });
                        }
                    }
                }
            }
        }
        
    } catch (err) {
        winston.error('[auto-translate] Failed to apply server-side translation:', err);
        // フィルターエラーでレンダリングを止めない
    }
    
    return data;
};

/**
 * Detect language from request
 */
async function detectLanguage(req) {
    winston.info('[auto-translate] Detecting language for user:', {
        uid: req.uid,
        hasUser: !!req.user,
        url: req.url,
        originalUrl: req.originalUrl,
        urlParams: req.query,
        locale: req.query.locale,
        lang: req.query.lang,
        userSettings: req.user ? req.user.settings : 'none'
    });
    
    // 1. URL クエリパラメータ（最優先）
    const urlLang = req.query.locale || req.query.lang;
    if (urlLang) {
        const normalizedUrlLang = normalizeBrowserLanguage(urlLang) || urlLang;
        if (isSupportedLanguage(normalizedUrlLang)) {
            winston.info('[auto-translate] Language from URL:', {
                original: urlLang,
                normalized: normalizedUrlLang
            });
            return normalizedUrlLang;
        }
    }
    
    // 2. ユーザー設定 - NodeBBのユーザー設定から取得
    if (req.uid) {
        try {
            const User = require.main.require('./src/user');
            const userSettings = await User.getSettings(req.uid);
            
            winston.verbose('[auto-translate] User settings retrieved:', {
                userLang: userSettings.userLang,
                language: userSettings.language
            });
            
            // userLang または language フィールドをチェック
            const userLang = userSettings.userLang || userSettings.language;
            if (userLang) {
                const normalizedUserLang = normalizeBrowserLanguage(userLang);
                winston.verbose('[auto-translate] Normalizing user language:', {
                    original: userLang,
                    normalized: normalizedUserLang,
                    isSupported: normalizedUserLang ? isSupportedLanguage(normalizedUserLang) : false
                });
                
                if (normalizedUserLang && isSupportedLanguage(normalizedUserLang)) {
                    winston.info('[auto-translate] Language from user settings:', {
                        original: userLang,
                        normalized: normalizedUserLang
                    });
                    return normalizedUserLang;
                } else {
                    winston.warn('[auto-translate] User language not supported:', {
                        userLang,
                        normalizedUserLang,
                        supportedLanguages: ['en','zh-CN','hi','es','ar','fr','bn','ru','pt','ur','id','de','ja','fil','tr','ko','fa','sw','ha','it']
                    });
                }
            }
        } catch (err) {
            winston.error('[auto-translate] Failed to get user settings:', err);
        }
    }
    
    // 3. Accept-Language ヘッダー（ブラウザ設定）
    const acceptLang = req.headers['accept-language'];
    if (acceptLang) {
        const browserLang = parseBrowserLanguage(acceptLang);
        if (browserLang && isSupportedLanguage(browserLang)) {
            winston.info('[auto-translate] Language from browser:', { language: browserLang });
            return browserLang;
        }
    }
    
    winston.info('[auto-translate] No language detected, using default');
    return null;
}

/**
 * Parse browser Accept-Language header
 */
function parseBrowserLanguage(acceptLang) {
    try {
        if (!acceptLang || typeof acceptLang !== 'string') {
            return null;
        }
        
        const languages = acceptLang.split(',').map(lang => {
            const [code, q] = lang.trim().split(';q=');
            return { code: code.trim(), q: q ? parseFloat(q) : 1.0 };
        });
        
        // 優先度順にソート
        languages.sort((a, b) => b.q - a.q);
        
        winston.verbose('[auto-translate] Parsed Accept-Language:', languages);
        
        // 対応言語を探す
        for (const { code } of languages) {
            const normalized = normalizeBrowserLanguage(code);
            if (normalized) {
                winston.verbose('[auto-translate] Browser language normalized:', { code, normalized });
                return normalized;
            }
        }
        
        return null;
    } catch (err) {
        winston.error('[auto-translate] Failed to parse Accept-Language header:', err);
        return null;
    }
}

/**
 * Hook: Filter search results to apply i18n (title/content)
 */
plugin.filterSearchContentGetResult = async function(payload) {
    try {
        if (!payload || !payload.result || !Array.isArray(payload.result.posts)) {
            return payload;
        }
        const uid = payload && payload.data && payload.data.uid;
        if (!uid) {
            // No user context; do not alter
            return payload;
        }
        const User = require.main.require('./src/user');
        const userSettings = await User.getSettings(uid);
        const userLang = userSettings && (userSettings.userLang || userSettings.language);
        const targetLang = normalizeBrowserLanguage(userLang);
        if (!targetLang || !isSupportedLanguage(targetLang)) {
            return payload;
        }

        // Apply translation per post summary
        for (const post of payload.result.posts) {
            // Topic title translation
            if (post && post.topic && post.topic.tid) {
                const t = await getTranslations('topic', post.topic.tid);
                const translatedTitle = t && t.translations && t.translations[targetLang];
                if (translatedTitle) {
                    const clean = cleanMarkdownTitle(translatedTitle);
                    post.topic.title = clean;
                }
            }
            // Post content translation
            if (post && post.pid) {
                const t = await getTranslations('post', post.pid);
                const translatedContent = t && t.translations && t.translations[targetLang];
                if (translatedContent) {
                    // Keep it simple: wrap as paragraph (search summaries are HTML snippets)
                    post.content = `<p>${translatedContent}</p>`;
                }
            }
        }
    } catch (err) {
        winston.error('[auto-translate] Failed to apply i18n to search results:', err);
        // Do not block search rendering
    }
    return payload;
};

/**
 * Normalize browser language code
 */
function normalizeBrowserLanguage(langCode) {
    if (!langCode || typeof langCode !== 'string') {
        winston.verbose('[auto-translate] Invalid language code:', { langCode, type: typeof langCode });
        return null;
    }
    
    const langMap = {
        'en': 'en', 'en-us': 'en', 'en-gb': 'en',
        'ja': 'ja', 'ja-jp': 'ja',
        'zh': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-CN',
        'ko': 'ko', 'ko-kr': 'ko',
        'es': 'es', 'es-es': 'es',
        'fr': 'fr', 'fr-fr': 'fr',
        'de': 'de', 'de-de': 'de',
        'it': 'it', 'it-it': 'it',
        'pt': 'pt', 'pt-br': 'pt',
        'ru': 'ru', 'ru-ru': 'ru',
        'ar': 'ar', 'hi': 'hi', 'bn': 'bn', 'ur': 'ur',
        'id': 'id', 'fil': 'fil', 'tr': 'tr', 'fa': 'fa',
        'sw': 'sw', 'ha': 'ha'
    };
    
    const normalized = langMap[langCode.toLowerCase()] || null;
    winston.verbose('[auto-translate] Language normalization:', {
        input: langCode,
        output: normalized
    });
    
    return normalized;
}

/**
 * Check if language is supported
 */
function isSupportedLanguage(lang) {
    const LANG_KEYS = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                       "id","de","ja","fil","tr","ko","fa","sw","ha","it"];
    return LANG_KEYS.includes(lang);
}

/**
 * Get translations from database
 */
async function getTranslations(type, id) {
    try {
        const translationKey = `auto-translate:${type}:${id}`;
        winston.verbose('[auto-translate] Getting translations from database', {
            type, 
            id, 
            key: translationKey,
            idType: typeof id
        });
        
        const translations = await db.getObject(translationKey);
        winston.verbose('[auto-translate] Database query result', {
            key: translationKey,
            hasResult: !!translations,
            resultKeys: translations ? Object.keys(translations) : [],
            hasTranslationsProperty: !!(translations && translations.translations)
        });
        
        return translations || null;
    } catch (err) {
        winston.error('[auto-translate] Failed to get translations:', err);
        return null;
    }
}

/**
 * Clean markdown title
 */
function cleanMarkdownTitle(text) {
    if (!text) return text;
    return text.replace(/^#+\s*/, '').trim();
}

/**
 * Check admin privileges
 */
async function requireAdmin(socket) {
    if (!socket.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    
    const user = require.main.require('./src/user');
    const isAdmin = await user.isAdministrator(socket.uid);
    if (!isAdmin) {
        throw new Error('[[error:no-privileges]]');
    }
}

module.exports = plugin;
