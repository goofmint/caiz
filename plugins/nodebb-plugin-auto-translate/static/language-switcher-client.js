/**
 * Language Switcher Client-side Script
 */

$(document).ready(function() {
    'use strict';
    
    // Language names will be loaded from NodeBB's translator
    let LANGUAGE_NAMES = {};
    let translatorReady = false;
    
    /**
     * Load translated language names from NodeBB's i18n system
     */
    function loadLanguageNames() {
        const LANG_KEYS = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                           "id","de","ja","fil","tr","ko","fa","sw","ha","it"];
        
        require(['translator'], function(translator) {
            const translationKeys = LANG_KEYS.map(langKey => `[[auto-translate:languages.${langKey}]]`);
            
            Promise.all(translationKeys.map(key => translator.translate(key)))
                .then(function(translations) {
                    LANG_KEYS.forEach((langKey, index) => {
                        LANGUAGE_NAMES[langKey] = translations[index];
                    });
                    translatorReady = true;
                    console.log('[language-switcher] Loaded language names:', LANGUAGE_NAMES);
                    // 翻訳が完了したら初期化
                    updateLanguageSwitcher();
                })
                .catch(function(err) {
                    console.error('[language-switcher] Failed to load language translations:', err);
                    throw new Error('Failed to load language translations: ' + err.message);
                });
        });
    }
    
    const SUPPORTED_LANGUAGES = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur",
                                  "id","de","ja","fil","tr","ko","fa","sw","ha","it"];
    
    /**
     * Get current language from URL parameters
     */
    function getCurrentLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const locale = urlParams.get('locale') || urlParams.get('lang');
        
        if (locale && SUPPORTED_LANGUAGES.includes(locale)) {
            return locale;
        }
        
        // No locale parameter found
        return null;
    }
    
    /**
     * Update language switcher UI
     */
    function updateLanguageSwitcher() {
        const currentLang = getCurrentLanguage();
        const $switcher = $('.language-switcher');
        
        if ($switcher.length === 0) {
            return;
        }
        
        if (!currentLang) {
            console.log('[language-switcher] No current language detected, skipping update');
            return;
        }
        
        if (!translatorReady) {
            console.log('[language-switcher] Translator not ready yet, skipping update');
            return;
        }
        
        console.log('[language-switcher] Updating UI for language:', currentLang);
        
        // Update button text
        if (!LANGUAGE_NAMES[currentLang]) {
            throw new Error(`[language-switcher] Language name not found for: ${currentLang}`);
        }
        
        const currentName = LANGUAGE_NAMES[currentLang];
        $switcher.find('.language-name').text(currentName);
        $switcher.find('button').attr('title', 'Current: ' + currentLang);
        
        // Update active states in existing dropdown items
        $switcher.find('.dropdown-item').each(function() {
            const $item = $(this);
            const langCode = $item.attr('data-lang');
            const isActive = langCode === currentLang;
            
            // Update active class
            $item.toggleClass('active', isActive);
            
            // Update check icon
            const $check = $item.find('.fa-check');
            if (isActive && $check.length === 0) {
                $item.append('<i class="fa fa-check ms-2"></i>');
            } else if (!isActive && $check.length > 0) {
                $check.remove();
            }
        });
        
        console.log('[language-switcher] UI updated to:', currentName, '(' + currentLang + ')');
    }
    
    /**
     * Initialize language switcher
     */
    function initLanguageSwitcher() {
        console.log('[language-switcher] Initializing client-side language switcher');
        loadLanguageNames();
    }
    
    /**
     * Handle page navigation (NodeBB's ajaxify system)
     */
    $(window).on('action:ajaxify.end', function(ev, data) {
        console.log('[language-switcher] Page navigation detected, updating language switcher');
        if (translatorReady) {
            // Small delay to ensure DOM is updated
            setTimeout(updateLanguageSwitcher, 100);
        } else {
            console.log('[language-switcher] Translator not ready, skipping ajaxify update');
        }
    });
    
    /**
     * Handle URL changes (back/forward navigation)
     */
    $(window).on('popstate', function() {
        console.log('[language-switcher] Browser navigation detected, updating language switcher');
        if (translatorReady) {
            setTimeout(updateLanguageSwitcher, 100);
        }
    });
    
    // Initialize on page load
    initLanguageSwitcher();
    
    // Also update on URL parameter changes
    let lastUrl = window.location.href;
    setInterval(function() {
        if (lastUrl !== window.location.href) {
            lastUrl = window.location.href;
            console.log('[language-switcher] URL change detected, updating language switcher');
            if (translatorReady) {
                updateLanguageSwitcher();
            }
        }
    }, 1000);
});