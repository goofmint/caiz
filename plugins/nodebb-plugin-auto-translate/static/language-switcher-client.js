/**
 * Language Switcher Client-side Script
 */

$(document).ready(function() {
    'use strict';
    
    // Language names mapping (same as server-side)
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
        
        // Fallback: detect from user settings or default to 'ja'
        return 'ja'; // Default for this site
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
        
        console.log('[language-switcher] Updating UI for language:', currentLang);
        
        // Update button text
        const currentName = LANGUAGE_NAMES[currentLang] || currentLang;
        $switcher.find('.language-name').text(currentName);
        $switcher.find('button').attr('title', 'Current: ' + currentLang);
        
        // Update active states in dropdown
        $switcher.find('.dropdown-item').each(function() {
            const $item = $(this);
            const href = $item.attr('href');
            const isActive = href && href.includes('locale=' + currentLang);
            
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
        updateLanguageSwitcher();
    }
    
    /**
     * Handle page navigation (NodeBB's ajaxify system)
     */
    $(window).on('action:ajaxify.end', function(ev, data) {
        console.log('[language-switcher] Page navigation detected, updating language switcher');
        // Small delay to ensure DOM is updated
        setTimeout(updateLanguageSwitcher, 100);
    });
    
    /**
     * Handle URL changes (back/forward navigation)
     */
    $(window).on('popstate', function() {
        console.log('[language-switcher] Browser navigation detected, updating language switcher');
        setTimeout(updateLanguageSwitcher, 100);
    });
    
    // Initialize on page load
    initLanguageSwitcher();
    
    // Also update on URL parameter changes
    let lastUrl = window.location.href;
    setInterval(function() {
        if (lastUrl !== window.location.href) {
            lastUrl = window.location.href;
            console.log('[language-switcher] URL change detected, updating language switcher');
            updateLanguageSwitcher();
        }
    }, 1000);
});