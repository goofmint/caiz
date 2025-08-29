'use strict';

const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');

class I18nSettings {
  constructor() {
    this.settingsKey = 'i18n:geminiApiKey';
  }

  async getSettings() {
    try {
      const apiKey = await meta.settings.getOne('caiz', this.settingsKey);
      return { hasKey: !!apiKey };
    } catch (err) {
      winston.error(`[plugin/caiz] Error getting i18n settings: ${err.message}`);
      throw err;
    }
  }

  async saveSettings({ apiKey }) {
    try {
      if (typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('Invalid API key');
      }
      const updates = {};
      updates[this.settingsKey] = apiKey.trim();
      await meta.settings.set('caiz', updates);
      winston.info('[plugin/caiz] I18n settings saved (Gemini API key)');
    } catch (err) {
      winston.error(`[plugin/caiz] Error saving i18n settings: ${err.message}`);
      throw err;
    }
  }
}

module.exports = new I18nSettings();

