'use strict';

const meta = require.main.require('./src/meta');

const settings = {};

settings.init = async () => {
  // Initialize default settings if not exists
  const defaults = {
    clientKey: '',
    clientSecret: '',
    callbackUrl: '/x-notification/callback'
  };
  
  const currentSettings = await meta.settings.get('x-notification');
  if (!currentSettings || !Object.keys(currentSettings).length) {
    await meta.settings.set('x-notification', defaults);
  }
};

settings.get = async () => {
  const settingsData = await meta.settings.get('x-notification');
  return {
    clientKey: settingsData.clientKey || '',
    clientSecret: settingsData.clientSecret || '',
    callbackUrl: settingsData.callbackUrl || '/x-notification/callback'
  };
};

settings.save = async (data) => {
  if (!data.clientKey || !data.clientSecret) {
    throw new Error('[[x-notification:error.missing-api-keys]]');
  }
  
  await meta.settings.set('x-notification', {
    clientKey: data.clientKey,
    clientSecret: data.clientSecret,
    callbackUrl: data.callbackUrl || '/x-notification/callback'
  });
};

settings.getDecrypted = async () => {
  // In production, decrypt the keys here
  // For now, return as-is
  return await settings.get();
};

module.exports = settings;