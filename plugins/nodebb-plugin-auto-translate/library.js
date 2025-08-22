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
        
        winston.info('[auto-translate] Set header template variables', {
            seoLang: lang,
            userLang: lang,
            hreflangCount: templateData.hreflangs ? templateData.hreflangs.length : 0,
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
        await translateAndSaveContent('post', post.pid, post.content, settings);
        
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
        await translateAndSaveContent('topic', topic.tid, markdownTitle, settings);
        
    } catch (err) {
        winston.error('[auto-translate] Failed to translate topic:', err);
        // Don't fail the topic creation if translation fails
    }
    
    return data;
};

/**
 * Translate content and save to database
 */
async function translateAndSaveContent(type, id, content, settings) {
    try {
        // Build translation prompt
        const prompt = plugin.promptManager.buildTranslationPrompt(content, settings);
        
        // Call translation API
        const result = await plugin.apiClient.translateContent(prompt, settings);
        
        if (!result.success) {
            throw new Error(result.error || 'Translation failed');
        }
        
        // Save translations to database
        const translationKey = `auto-translate:${type}:${id}`;
        await db.setObject(translationKey, {
            original: content,
            translations: result.translations,
            created: Date.now(),
            usage: result.usage
        });
        
        winston.info('[auto-translate] Saved translations:', {
            type,
            id,
            languageCount: Object.keys(result.translations).length
        });
        
    } catch (err) {
        winston.error('[auto-translate] Translation and save failed:', err);
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
            for (const post of templateData.posts) {
                if (post.pid) {
                    const translations = await getTranslations('post', post.pid);
                    if (translations && translations.translations && translations.translations[targetLang]) {
                        const translatedContent = translations.translations[targetLang];
                        
                        try {
                            // 翻訳されたMarkdownコンテンツをHTMLに変換
                            const Posts = require.main.require('./src/posts');
                            
                            // postDataオブジェクトを作成
                            const postDataForParsing = {
                                pid: post.pid,
                                content: translatedContent,
                                sourceContent: translatedContent,
                                uid: post.uid,
                                tid: post.tid
                            };
                            
                            const parsedPostData = await Posts.parsePost(postDataForParsing, 'default');
                            
                            post.content = parsedPostData.content;
                            post.originalContent = post.content; // バックアップ
                            
                            winston.verbose('[auto-translate] Server-side post translation applied with HTML parsing', {
                                pid: post.pid,
                                lang: targetLang,
                                originalLength: translatedContent.length,
                                parsedLength: parsedPostData.content.length
                            });
                        } catch (parseErr) {
                            winston.error('[auto-translate] Failed to parse translated content:', parseErr);
                            // パースに失敗した場合は生のテキストを使用
                            post.content = translatedContent;
                            post.originalContent = post.content;
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
    winston.verbose('[auto-translate] Detecting language for user:', {
        uid: req.uid,
        hasUser: !!req.user,
        urlParams: req.query,
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
        const translations = await db.getObject(translationKey);
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