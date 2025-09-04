'use strict';

const meta = require.main.require('./src/meta');

const xSettings = {};

xSettings.init = async () => {
  // Initialize default settings if not exists
  const defaults = {
    xClientKey: '',
    xClientSecret: '',
    xCallbackUrl: '/caiz/oauth/x/callback'
  };
  
  const currentSettings = await meta.settings.get('caiz');
  if (!currentSettings.xClientKey && !currentSettings.xClientSecret) {
    await meta.settings.set('caiz', {
      ...currentSettings,
      ...defaults
    });
  }
};

xSettings.get = async () => {
  const settingsData = await meta.settings.get('caiz');
  return {
    clientKey: settingsData.xClientKey || '',
    clientSecret: settingsData.xClientSecret || '',
    callbackUrl: settingsData.xCallbackUrl || '/caiz/oauth/x/callback'
  };
};

xSettings.save = async (data) => {
  if (!data.clientKey || !data.clientSecret) {
    throw new Error('[[caiz:error.missing-x-keys]]');
  }
  
  const currentSettings = await meta.settings.get('caiz');
  await meta.settings.set('caiz', {
    ...currentSettings,
    xClientKey: data.clientKey,
    xClientSecret: data.clientSecret,
    xCallbackUrl: data.callbackUrl || '/caiz/oauth/x/callback'
  });
};

xSettings.getDecrypted = async () => {
  // In production, decrypt the keys here
  // For now, return as-is
  return await xSettings.get();
};

module.exports = xSettings;