'use strict';

const meta = require.main.require('./src/meta');

// プラグイン設定の保存
async function saveSettings(settings) {
    // APIキーは暗号化して保存し、クライアントには送信しない
    const safeSettings = { ...settings };
    if (safeSettings.apiKey) {
        // NodeBBの暗号化機能を使用
        await meta.settings.setEncrypted('ai-moderation', 'apiKey', safeSettings.apiKey);
        delete safeSettings.apiKey; // レスポンスから削除
    }
    
    await meta.settings.set('ai-moderation', safeSettings);
    return safeSettings;
}

// プラグイン設定の取得
async function getSettings() {
    const settings = await meta.settings.get('ai-moderation');
    // APIキーは復号化（サーバーサイドのみ）
    const apiKey = await meta.settings.getEncrypted('ai-moderation', 'apiKey');
    return {
        ...settings,
        hasApiKey: !!apiKey, // クライアントには存在確認のみ送信
        // apiKeyの実際の値はサーバーサイドでのみ使用
    };
}

// APIキーの安全な取得（サーバーサイドのみ）
async function getApiKey() {
    return await meta.settings.getEncrypted('ai-moderation', 'apiKey');
}

module.exports = {
    saveSettings,
    getSettings,
    getApiKey
};