'use strict';

const meta = require.main.require('./src/meta');

// プラグイン設定の保存
async function saveSettings(settings) {
    await meta.settings.set('ai-moderation', settings);
    return settings;
}

// プラグイン設定の取得
async function getSettings() {
    const settings = await meta.settings.get('ai-moderation') || {};
    return {
        enabled: settings.enabled !== false,  // デフォルトは有効
        provider: settings.provider || 'openai',
        apiKey: settings.apiKey || '',
        thresholds: {
            flag: parseInt(settings['thresholds.flag'] || settings.thresholdFlag, 10) || 70,
            reject: parseInt(settings['thresholds.reject'] || settings.thresholdReject, 10) || 90
        },
        hasApiKey: !!settings.apiKey
    };
}

// APIキーの安全な取得（サーバーサイドのみ）
async function getApiKey() {
    const settings = await meta.settings.get('ai-moderation') || {};
    return settings.apiKey || '';
}

module.exports = {
    saveSettings,
    getSettings,
    getApiKey
};