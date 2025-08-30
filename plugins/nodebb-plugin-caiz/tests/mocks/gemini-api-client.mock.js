'use strict';

// Mock of ../../nodebb-plugin-auto-translate/lib/translation/api-client

const LANG_KEYS = [
  'en','zh-CN','hi','es','ar','fr','bn','ru','pt','ur',
  'id','de','ja','fil','tr','ko','fa','sw','ha','it',
];

class GeminiApiClientMock {
  initialize(settings) {
    if (!settings || !settings.api || !settings.api.geminiApiKey) {
      throw new Error('Gemini API key is required');
    }
    this.initialized = true;
  }

  async translateContent(prompt) {
    if (!this.initialized) {
      throw new Error('API client not initialized');
    }
    // Return deterministic translations: `${first10Chars}-${lang}`
    const base = String(prompt).slice(0, 10);
    const translations = {};
    for (const lang of LANG_KEYS) {
      translations[lang] = `${base}-${lang}`;
    }
    return { success: true, translations };
  }
}

module.exports = GeminiApiClientMock;

