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
        flagUid: parseInt(settings.flagUid, 10) || 1,  // フラグを作成するユーザーID
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
    getApiKey,
    ensureEditDefaults: async function ensureEditDefaults() {
        const current = await meta.settings.get('ai-moderation') || {};
        const seed = {};
        if (!current.hasOwnProperty('edit.enabled')) seed['edit.enabled'] = 'true';
        if (!current.hasOwnProperty('edit.minChange.relative')) seed['edit.minChange.relative'] = '0.10';
        if (!current.hasOwnProperty('edit.minChange.absolute')) seed['edit.minChange.absolute'] = '20';
        if (!current.hasOwnProperty('edit.cooldownSecs')) seed['edit.cooldownSecs'] = '10';
        if (!current.hasOwnProperty('edit.excludedRoles')) seed['edit.excludedRoles'] = '';
        if (Object.keys(seed).length) {
            await meta.settings.set('ai-moderation', { ...current, ...seed });
        }
    }
};
