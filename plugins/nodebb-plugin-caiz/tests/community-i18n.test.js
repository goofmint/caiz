'use strict';

const path = require('path');

function mockModule(targetPath, mockExports) {
  const resolved = require.resolve(targetPath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mockExports };
}

(async () => {
  try {
    // Build absolute paths from the perspective of community-i18n.js
    const baseDir = path.join(__dirname, '..'); // plugins/nodebb-plugin-caiz
    const i18nLibDir = path.join(baseDir, 'libs');

    const apiClientPath = path.join(baseDir, '..', 'nodebb-plugin-auto-translate', 'lib', 'translation', 'api-client.js');
    const dataPath = path.join(i18nLibDir, 'community', 'data.js');
    const settingsPath = path.join(i18nLibDir, 'i18n-settings.js');

    // Inject mocks into require cache BEFORE requiring the target module
    const GeminiApiClientMock = require('./mocks/gemini-api-client.mock');
    const dataMock = require('./mocks/data.mock');
    const settingsMock = require('./mocks/i18n-settings.mock');

    mockModule(apiClientPath, GeminiApiClientMock);
    mockModule(dataPath, dataMock);
    mockModule(settingsPath, settingsMock);

    const communityI18n = require(path.join(i18nLibDir, 'community-i18n.js'));

    // Test translateOnCreate
    const name = 'Test Community';
    const description = 'This is a description.';
    const result = await communityI18n.translateOnCreate({ name, description });

    if (!result || !result.nameTranslations) {
      throw new Error('nameTranslations missing');
    }
    const langs = Object.keys(result.nameTranslations);
    if (langs.length !== 20) {
      throw new Error('Expected 20 name translations, got ' + langs.length);
    }

    if (!result.descTranslations || Object.keys(result.descTranslations).length !== 20) {
      throw new Error('Expected 20 description translations');
    }

    // Test saveTranslations writes all fields
    dataMock.__calls.length = 0;
    const fakeCid = 9999;
    await communityI18n.saveTranslations(fakeCid, result);

    // Expect 20 writes for names + 20 for descriptions = 40
    const writeCount = dataMock.__calls.length;
    if (writeCount !== 40) {
      throw new Error('Expected 40 DB writes, got ' + writeCount);
    }

    // Basic shape check of first write
    const first = dataMock.__calls[0];
    if (!first.key.startsWith('category:') || !first.field.startsWith('i18n:name:')) {
      throw new Error('Unexpected write format: ' + JSON.stringify(first));
    }

    console.log('OK community-i18n tests passed');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    process.exit(1);
  }
})();

