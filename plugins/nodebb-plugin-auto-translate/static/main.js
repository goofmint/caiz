'use strict';

define('auto-translate/main', ['alerts'], function (alerts) {
    const AutoTranslate = {};
    
    // 対応言語キー
    const LANG_KEYS = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                       "id","de","ja","fil","tr","ko","fa","sw","ha","it"];
    
    // 翻訳文字列キャッシュ
    let translationCache = {};
    let translatorReady = false;
    
    // NodeBB標準の翻訳システムを使用
    function initializeTranslations() {
        require(['translator'], function (translator) {
            const keys = [
                'auto-translate:show-original',
                'auto-translate:show-translation', 
                'auto-translate:original-title',
                'auto-translate:translation-title',
                'auto-translate:loading'
            ];
            
            Promise.all(keys.map(key => translator.translate('[[' + key + ']]')))
                .then(function(translations) {
                    translationCache = {
                        'show-original': translations[0],
                        'show-translation': translations[1],
                        'original-title': translations[2],
                        'translation-title': translations[3],
                        'loading': translations[4]
                    };
                    translatorReady = true;
                    console.log('[auto-translate] Translations loaded:', translationCache);
                })
                .catch(function(err) {
                    console.error('[auto-translate] Failed to load translations:', err);
                    // フォールバック
                    translationCache = {
                        'show-original': 'Show Original',
                        'show-translation': 'Show Translation',
                        'original-title': 'Show original title',
                        'translation-title': 'Show translation',
                        'loading': 'Loading...'
                    };
                    translatorReady = true;
                });
        });
    }
    
    // 翻訳文字列を取得する関数
    function translate(key) {
        return translationCache[key] || key;
    }
    
    // 言語名マッピング
    const LANG_NAMES = {
        'en': 'English',
        'zh-CN': '中文(简)',
        'hi': 'हिन्दी',
        'es': 'Español',
        'ar': 'العربية',
        'fr': 'Français',
        'bn': 'বাংলা',
        'ru': 'Русский',
        'pt': 'Português',
        'ur': 'اردو',
        'id': 'Indonesia',
        'de': 'Deutsch',
        'ja': '日本語',
        'fil': 'Filipino',
        'tr': 'Türkçe',
        'ko': '한국어',
        'fa': 'فارسی',
        'sw': 'Kiswahili',
        'ha': 'Hausa',
        'it': 'Italiano'
    };
    
    let selectedLanguage = null;
    
    AutoTranslate.init = function () {
        console.log('[auto-translate] Initializing - manual translation mode only');
        
        // 翻訳文字列を初期化してからボタンを追加
        initializeTranslations();
        
        // 翻訳の準備が完了するまで待機
        const waitForTranslations = function() {
            if (translatorReady) {
                addTranslationButtons();
            } else {
                setTimeout(waitForTranslations, 100);
            }
        };
        waitForTranslations();
    };
    
    function addTranslationButtons() {
        console.log('[auto-translate] Adding translation buttons');
        
        // 投稿に原文表示ボタンを追加
        $('[data-pid]').each(function() {
            const $post = $(this);
            const pid = $post.attr('data-pid');
            
            if (pid && !$post.find('.show-original-toggle').length) {
                console.log('[auto-translate] Adding button to post:', pid);
                
                const $button = $('<button class="btn btn-sm btn-outline-primary show-original-toggle ms-2" title="' + translate('original-title') + '">' +
                    '<i class="fa fa-eye"></i> ' + translate('show-original') + '</button>');
                
                $button.on('click', function(e) {
                    e.preventDefault();
                    console.log('[auto-translate] Original button clicked for post:', pid);
                    toggleOriginalContent('post', pid, $post);
                });
                
                // 投稿のボタンエリアに追加
                const $buttonArea = $post.find('.post-tools, .topic-main-buttons').first();
                if ($buttonArea.length) {
                    $buttonArea.append($button);
                    console.log('[auto-translate] Button added to post-tools for pid:', pid);
                } else {
                    // フォールバック: 投稿コンテンツの後に追加
                    $post.find('.content').after($button);
                    console.log('[auto-translate] Button added after content for pid:', pid);
                }
            }
        });
        
        // トピックタイトルに原文表示ボタンを追加
        const $topicHeader = $('.topic-header h1, [component="topic/title"]').first();
        if ($topicHeader.length && !$topicHeader.find('.show-original-topic-toggle').length) {
            const tidMatch = window.location.pathname.match(/\/topic\/(\d+)/);
            if (tidMatch) {
                const tid = tidMatch[1];
                console.log('[auto-translate] Adding button to topic:', tid, 'Element:', $topicHeader[0]);
                
                const $button = $('<button class="btn btn-sm btn-outline-primary show-original-topic-toggle ms-2" title="' + translate('original-title') + '">' +
                    '<i class="fa fa-eye"></i> ' + translate('show-original') + '</button>');
                
                $button.on('click', function(e) {
                    e.preventDefault();
                    console.log('[auto-translate] Original button clicked for topic:', tid);
                    console.log('[auto-translate] Topic header element details:', {
                        tagName: $topicHeader[0].tagName,
                        className: $topicHeader[0].className,
                        component: $topicHeader.attr('component')
                    });
                    // ボタンが追加された要素自体を渡す
                    toggleOriginalContent('topic', tid, $topicHeader);
                });
                
                $topicHeader.append($button);
                console.log('[auto-translate] Button added to topic header for tid:', tid);
            }
        }
    }
    
    function toggleOriginalContent(type, id, $container) {
        console.log('[auto-translate] Toggling original content for:', type, id);
        
        const $button = $container.find('.show-original-toggle, .show-original-topic-toggle');
        let $content;
        
        if (type === 'topic') {
            // トピックタイトルの場合、span.topic-title要素自体がコンテンツ
            $content = $container;
        } else {
            // 投稿の場合
            $content = $container.find('.content').first();
            if ($content.length === 0) {
                $content = $container.find('[component="post/content"]').first();
            }
        }
            
        console.log('[auto-translate] Elements found:', {
            buttonCount: $button.length,
            contentCount: $content.length,
            containerClass: $container.attr('class'),
            containerHtml: $container.length > 0 ? $container[0].outerHTML.substring(0, 200) + '...' : 'not found',
            type: type
        });
        
        // 要素が見つからない場合は終了
        if ($content.length === 0) {
            console.error('[auto-translate] Content element not found for:', type, id);
            return;
        }
        
        if ($button.length === 0) {
            console.error('[auto-translate] Button element not found for:', type, id);
            return;
        }
        
        // データ属性で原文を保存/復元
        const originalKey = type + '-original-' + id;
        let originalContent = $content.data(originalKey);
        
        if (!originalContent) {
            // 原文を取得して保存
            console.log('[auto-translate] Fetching original content for:', type, id);
            
            $button.html('<i class="fa fa-spinner fa-spin"></i> ' + translate('loading')).prop('disabled', true);
            
            // Socket.IOで原文データを取得
            console.log('[auto-translate] Emitting socket request:', { type, id });
            
            if (!window.socket) {
                console.error('[auto-translate] Socket not available');
                $button.html('<i class="fa fa-eye"></i> 原文表示').prop('disabled', false);
                return;
            }
            
            window.socket.emit('plugins.autoTranslate.getOriginal', { type, id }, function(err, data) {
                console.log('[auto-translate] Socket response received:', { err, data, type, id });
                
                // 必ずボタンを元に戻す処理を実行
                const resetButton = function() {
                    $button.html('<i class="fa fa-eye"></i> ' + translate('show-original'))
                        .removeClass('btn-primary').addClass('btn-outline-primary')
                        .attr('title', translate('original-title'))
                        .prop('disabled', false);
                };
                
                if (err) {
                    console.error('[auto-translate] Failed to load original:', err);
                    resetButton();
                    return;
                }
                
                if (!data || !data.original) {
                    console.log('[auto-translate] No original content found', { data, hasData: !!data, hasOriginal: data && !!data.original });
                    resetButton();
                    return;
                }
                
                console.log('[auto-translate] Original content found:', { 
                    originalLength: data.original.length,
                    preview: data.original.substring(0, 100) + '...'
                });
                
                // 原文を保存
                originalContent = data.original;
                $content.data(originalKey, originalContent);
                
                // 原文を表示
                try {
                    showOriginalContent($content, originalContent, $button, type);
                } catch (showErr) {
                    console.error('[auto-translate] Failed to show original content:', showErr);
                    resetButton();
                }
            });
        } else {
            // 既に原文がある場合は切り替え
            const currentContent = $content.html();
            const isShowingOriginal = $content.data('showing-original');
            
            if (isShowingOriginal) {
                // 翻訳に戻す
                if (type === 'topic' && $content.is('.topic-title, span[component="topic/title"]')) {
                    // トピックタイトルの特別処理：テキストノードのみ変更
                    const translatedContent = $content.data('translated-content');
                    
                    // ボタンを除いてテキストのみ変更
                    $content.contents().filter(function() {
                        return this.nodeType === 3; // テキストノード
                    }).remove();
                    
                    $content.prepend(translatedContent);
                } else {
                    $content.html($content.data('translated-content'));
                }
                $content.data('showing-original', false);
                
                // ボタンの状態を「原文表示」に戻す
                $button.html('<i class="fa fa-eye"></i> ' + translate('show-original'))
                    .removeClass('btn-primary').addClass('btn-outline-primary')
                    .attr('title', translate('original-title'));
                    
                console.log('[auto-translate] Switched back to translation, button updated');
            } else {
                // 原文を表示
                showOriginalContent($content, originalContent, $button, type);
            }
        }
    }
    
    function showOriginalContent($content, originalContent, $button, type) {
        console.log('[auto-translate] showOriginalContent called:', {
            type,
            contentLength: $content.length,
            originalLength: originalContent.length,
            buttonLength: $button.length
        });
        
        if (type === 'topic' && $content.is('.topic-title, span[component="topic/title"]')) {
            // トピックタイトルの特別処理：ボタンを保持してテキストのみ変更
            console.log('[auto-translate] Processing topic title, button element:', $button[0]);
            
            const currentText = $content.contents().filter(function() {
                return this.nodeType === 3; // テキストノード
            }).text() || $content.text().replace($button.text(), '').trim();
            
            $content.data('translated-content', currentText);
            
            console.log('[auto-translate] Current topic title saved:', currentText);
            
            const displayContent = cleanMarkdownTitle(originalContent);
            console.log('[auto-translate] Setting topic title to:', displayContent);
            
            // 既存のボタンの状態を更新
            $button.html('<i class="fa fa-eye-slash"></i> ' + translate('show-translation'))
                .removeClass('btn-outline-primary').addClass('btn-primary')
                .attr('title', translate('translation-title'))
                .prop('disabled', false);
            
            // ボタンを除いてテキストのみ変更
            $content.contents().filter(function() {
                return this.nodeType === 3; // テキストノード
            }).remove();
            
            $content.prepend(displayContent);
            $content.data('showing-original', true);
            
            console.log('[auto-translate] Topic title updated, button should be active');
        } else {
            // 投稿の通常処理（HTMLとして挿入）
            const currentHtml = $content.html();
            $content.data('translated-content', currentHtml);
            
            console.log('[auto-translate] Current content saved:', currentHtml ? currentHtml.substring(0, 100) + '...' : 'empty');
            console.log('[auto-translate] Setting content to:', originalContent ? originalContent.substring(0, 100) + '...' : 'empty');
            
            // 原文をHTMLとして挿入（サーバー側でHTMLに変換済み）
            $content.html(originalContent);
            $content.data('showing-original', true);
            
            // 投稿の場合のボタン更新
            $button.html('<i class="fa fa-eye-slash"></i> ' + translate('show-translation'))
                .removeClass('btn-outline-primary').addClass('btn-primary')
                .attr('title', translate('translation-title'))
                .prop('disabled', false);
        }
            
        console.log('[auto-translate] Content updated, button state changed');
    }
    
    function getLanguageFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const locale = urlParams.get('locale') || urlParams.get('lang');
        
        // 対応言語かチェック
        if (locale && LANG_KEYS.includes(locale)) {
            console.log('[auto-translate] Selected language from URL:', locale);
            return locale;
        }
        
        return null;
    }
    
    function getPreferredLanguage() {
        // 1. URL設定
        const urlLang = getLanguageFromUrl();
        if (urlLang) {
            return urlLang;
        }
        
        // 2. ユーザー設定（NodeBBの設定）
        const userLang = app.user && app.user.settings && app.user.settings.userLang;
        if (userLang && LANG_KEYS.includes(userLang)) {
            console.log('[auto-translate] Using user language setting:', userLang);
            return userLang;
        }
        
        // 3. ブラウザの言語
        const browserLang = navigator.language || navigator.userLanguage;
        const normalizedLang = normalizeBrowserLanguage(browserLang);
        if (normalizedLang && LANG_KEYS.includes(normalizedLang)) {
            console.log('[auto-translate] Using browser language:', normalizedLang);
            return normalizedLang;
        }
        
        // 4. フォールバック: 最初の利用可能な翻訳
        return null;
    }
    
    function normalizeBrowserLanguage(browserLang) {
        if (!browserLang) return null;
        
        // ブラウザ言語コードを対応言語にマッピング
        const langMap = {
            'en': 'en',
            'en-US': 'en',
            'en-GB': 'en',
            'ja': 'ja',
            'ja-JP': 'ja',
            'zh': 'zh-CN',
            'zh-CN': 'zh-CN',
            'zh-TW': 'zh-CN', // 簡体字にフォールバック
            'ko': 'ko',
            'ko-KR': 'ko',
            'es': 'es',
            'es-ES': 'es',
            'fr': 'fr',
            'fr-FR': 'fr',
            'de': 'de',
            'de-DE': 'de',
            'it': 'it',
            'it-IT': 'it',
            'pt': 'pt',
            'pt-BR': 'pt',
            'ru': 'ru',
            'ru-RU': 'ru',
            'ar': 'ar',
            'hi': 'hi',
            'bn': 'bn',
            'ur': 'ur',
            'id': 'id',
            'fil': 'fil',
            'tr': 'tr',
            'fa': 'fa',
            'sw': 'sw',
            'ha': 'ha'
        };
        
        return langMap[browserLang.toLowerCase()] || null;
    }
    
    function cleanMarkdownTitle(text) {
        if (!text) return text;
        
        // Markdown見出し記号（# ）を先頭から除去
        return text.replace(/^#+\s*/, '').trim();
    }
    
    function autoShowTranslations() {
        // 投稿の翻訳を自動表示
        $('[data-pid]').each(function() {
            const $post = $(this);
            const pid = $post.attr('data-pid');
            
            if (pid && !$post.find('.auto-translations').length) {
                loadAndShowTranslations('post', pid, $post, true);
            }
        });
        
        // トピックタイトルの翻訳を自動表示
        // トピックページかチェック
        if (window.location.pathname.includes('/topic/')) {
            const tidMatch = window.location.pathname.match(/\/topic\/(\d+)/);
            if (tidMatch) {
                const tid = tidMatch[1];
                const $topicContainer = $('.topic-header, [data-tid="' + tid + '"]').first();
                
                if ($topicContainer.length && !$topicContainer.find('.auto-translations').length) {
                    console.log('[auto-translate] Loading topic translations for tid:', tid);
                    loadAndShowTranslations('topic', tid, $topicContainer, true);
                }
            }
        }
    }
    
    function toggleOriginalText(type, id, $container) {
        const $originalDiv = $container.find('.original-content');
        const $translationDiv = $container.find('.auto-translations');
        const $toggleBtn = $container.find('.original-toggle');
        
        if ($originalDiv.is(':visible')) {
            // 原文を非表示にして翻訳を表示
            $originalDiv.hide();
            $translationDiv.show();
            $toggleBtn.text('原文表示').removeClass('btn-secondary').addClass('btn-outline-secondary');
        } else {
            // 翻訳を非表示にして原文を表示
            $translationDiv.hide();
            $originalDiv.show();
            $toggleBtn.text('翻訳表示').removeClass('btn-outline-secondary').addClass('btn-secondary');
        }
    }
    
    function loadAndShowTranslations(type, id, $container, autoShow = false) {
        const $button = $container.find('.translation-toggle, .topic-translation-toggle');
        const originalHtml = $button.html();
        
        $button.html('<i class="fa fa-spin fa-spinner"></i> 読み込み中...').prop('disabled', true);
        
        window.socket.emit('plugins.autoTranslate.getTranslations', { type, id }, function(err, data) {
            if (err) {
                console.error('[auto-translate] Failed to load translations:', err);
                $button.html(originalHtml).prop('disabled', false);
                alerts.error('翻訳の読み込みに失敗しました');
                return;
            }
            
            if (!data || !data.translations) {
                $button.html(originalHtml).prop('disabled', false);
                alerts.info('この投稿の翻訳はまだ利用できません');
                return;
            }
            
            // 翻訳を表示
            showManualTranslations(data.translations, $container, type);
            
            // ボタンを「隠す」状態に変更
            $button.removeClass('btn-outline-secondary').addClass('btn-primary')
                .html('<i class="fa fa-eye-slash"></i> 翻訳を隠す')
                .attr('title', '翻訳を非表示')
                .prop('disabled', false);
        });
    }
    
    function showManualTranslations(translations, $container, type) {
        // 既存の翻訳表示を削除
        $container.find('.auto-translations').remove();
        
        // 翻訳表示エリアを作成
        const $translationDiv = $('<div class="auto-translations mt-3 p-3 bg-light rounded"></div>');
        
        // 言語選択タブ
        const $tabNav = $('<ul class="nav nav-pills nav-fill mb-3"></ul>');
        const $tabContent = $('<div class="tab-content"></div>');
        
        let isFirst = true;
        LANG_KEYS.forEach(langKey => {
            if (translations[langKey] && translations[langKey].trim()) {
                const langName = LANG_NAMES[langKey] || langKey;
                
                // タブ
                const $tabItem = $('<li class="nav-item"></li>');
                const $tabLink = $(`<a class="nav-link ${isFirst ? 'active' : ''}" data-bs-toggle="pill" href="#trans-${langKey}-${Date.now()}">${langName}</a>`);
                $tabItem.append($tabLink);
                $tabNav.append($tabItem);
                
                // タブ内容
                const $tabPane = $(`<div class="tab-pane fade ${isFirst ? 'show active' : ''}" id="trans-${langKey}-${Date.now()}"></div>`);
                const processedText = type === 'topic' ? cleanMarkdownTitle(translations[langKey]) : translations[langKey];
                $tabPane.append($('<div class="translation-text"></div>').text(processedText));
                $tabContent.append($tabPane);
                
                isFirst = false;
            }
        });
        
        if ($tabNav.children().length === 0) {
            $translationDiv.append('<p class="text-muted">翻訳が利用できません</p>');
        } else {
            $translationDiv.append($tabNav).append($tabContent);
        }
        
        // 翻訳をコンテナに追加
        $container.append($translationDiv);
        $translationDiv.slideDown();
    }
    
    function showTranslations(translations, originalContent, $container, type) {
        // URLパラメータで特定言語が指定されている場合
        if (selectedLanguage && translations[selectedLanguage]) {
            showSingleLanguage(translations[selectedLanguage], selectedLanguage, originalContent, $container, type);
            return;
        }
        
        // 通常の多言語タブ表示
        showMultiLanguageTabs(translations, originalContent, $container, type);
    }
    
    function showSingleLanguage(translatedText, langKey, originalContent, $container, type) {
        if (type === 'topic') {
            // トピックタイトルの場合は直接置き換え
            replaceTopicTitle(translatedText, $container);
        } else {
            // 投稿の場合は従来通り
            replacePostContent(translatedText, langKey, $container);
        }
    }
    
    function replaceTopicTitle(translatedText, $container) {
        // 複数のセレクターでタイトル要素を探す
        let $titleElement = $container.find('h1').first();
        if (!$titleElement.length) {
            $titleElement = $('.topic-title h1, .topic-header h1, [component="topic/title"]').first();
        }
        
        console.log('[auto-translate] Title element found:', $titleElement.length > 0);
        
        if ($titleElement.length) {
            // 既に処理済みかチェック
            if ($titleElement.find('.original-toggle').length > 0) {
                console.log('[auto-translate] Title already processed');
                return;
            }
            
            // 原文を保存
            const originalHtml = $titleElement.html();
            const $originalDiv = $('<div class="original-content" style="display: none;"></div>');
            $originalDiv.html(originalHtml);
            $titleElement.after($originalDiv);
            
            // タイトルを翻訳で置き換え（Markdown記号を除去）
            const cleanTitle = cleanMarkdownTitle(translatedText);
            $titleElement.empty().text(cleanTitle);
            
            // 原文表示ボタンを追加
            const $toggleBtn = $('<button class="btn btn-sm btn-outline-secondary original-toggle ms-2" title="原文を表示">' +
                '<i class="fa fa-eye"></i> 原文表示</button>');
            
            $toggleBtn.on('click', function(e) {
                e.preventDefault();
                toggleOriginalText('topic', null, $container);
            });
            
            $titleElement.append($toggleBtn);
            
            console.log('[auto-translate] Topic title replaced with:', cleanTitle);
        } else {
            console.log('[auto-translate] Title element not found');
        }
    }
    
    function replacePostContent(translatedText, langKey, $container) {
        const $contentElement = $container.find('.content').first();
        
        if ($contentElement.length) {
            // 原文を保存
            const $originalDiv = $('<div class="original-content" style="display: none;"></div>');
            $originalDiv.html($contentElement.html());
            $contentElement.after($originalDiv);
            
            // 翻訳表示エリア
            const $translationDiv = $('<div class="auto-translations"></div>');
            
            // 原文表示ボタンのみ（言語表示なし）
            const $toggleBtn = $('<button class="btn btn-sm btn-outline-secondary original-toggle mb-2" title="原文を表示">' +
                '<i class="fa fa-eye"></i> 原文表示</button>');
            
            $toggleBtn.on('click', function(e) {
                e.preventDefault();
                toggleOriginalText('post', null, $container);
            });
            
            $translationDiv.append($toggleBtn);
            
            // 翻訳テキスト
            const $translationText = $('<div class="translation-content"></div>').text(translatedText);
            $translationDiv.append($translationText);
            
            // 元のコンテンツを翻訳で置き換え
            $contentElement.after($translationDiv);
            $contentElement.hide();
        }
    }
    
    function showMultiLanguageTabs(translations, originalContent, $container, type) {
        // 優先言語で表示する翻訳を選択
        let targetLang = selectedLanguage;
        
        // 優先言語の翻訳がない場合は最初の利用可能な翻訳を使用
        if (!targetLang || !translations[targetLang] || !translations[targetLang].trim()) {
            targetLang = LANG_KEYS.find(key => translations[key] && translations[key].trim());
        }
        
        if (!targetLang) {
            console.log('[auto-translate] No translations available');
            return;
        }
        
        console.log('[auto-translate] Displaying translation in:', targetLang);
        
        if (type === 'topic') {
            replaceTopicTitle(translations[targetLang], $container);
        } else {
            replacePostContent(translations[targetLang], targetLang, $container);
        }
    }
    
    return AutoTranslate;
});

// ページ読み込み時に初期化
$(document).ready(function() {
    require(['auto-translate/main'], function(AutoTranslate) {
        AutoTranslate.init();
    });
});