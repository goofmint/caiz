'use strict';

const winston = require.main.require('winston');
const i18nSettings = require('./i18n-settings');
const data = require('./community/data');

// Target languages (must match task spec)
const LANG_KEYS = [
  'en','zh-CN','hi','es','ar','fr','bn','ru','pt','ur',
  'id','de','ja','fil','tr','ko','fa','sw','ha','it',
];

function buildPrompt(kind, text) {
  const heading = kind === 'name' ? 'community name' : 'community description';
  return [
    `Translate the following ${heading} into the specified target locales.`,
    `Only return strict JSON where each key is one of: ${JSON.stringify(LANG_KEYS)}.`,
    `Do not include any extra keys or commentary.`,
    `Text: ${text}`,
  ].join('\n');
}

async function translateWithGemini(prompt, apiKey) {
  // Reuse auto-translate plugin's Gemini client to avoid duplicating protocol details
  // This module expects @google/genai to be available at runtime.
  const GeminiApiClient = require('../../nodebb-plugin-auto-translate/lib/translation/api-client');
  const client = new GeminiApiClient();
  client.initialize({ api: { geminiApiKey: apiKey } });
  // Note: translateContent expects a prompt string and returns JSON object per language
  const result = await client.translateContent(prompt, {});
  if (!result || !result.success) {
    throw new Error(result && result.error ? result.error : 'Translation failed');
  }
  const translations = result.translations;
  // Validate exact language coverage and non-empty values
  for (const lang of LANG_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(translations, lang)) {
      throw new Error(`Missing translation for ${lang}`);
    }
    const v = translations[lang];
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new Error(`Empty translation for ${lang}`);
    }
  }
  // Ensure no extra keys
  const extraKeys = Object.keys(translations).filter(k => !LANG_KEYS.includes(k));
  if (extraKeys.length) {
    throw new Error(`Unexpected keys in translation: ${extraKeys.join(',')}`);
  }
  return translations;
}

async function translateOnCreate({ name, description }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('INVALID_INPUT: name is required');
  }
  winston.info('[community-i18n] translateOnCreate: input', {
    nameLength: name.length,
    hasDescription: typeof description === 'string' && !!description.trim(),
  });

  const apiKey = await i18nSettings.getApiKey();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  winston.info('[community-i18n] translateOnCreate: apiKeyPresent = true');
  const namePrompt = buildPrompt('name', name.trim());
  winston.info('[community-i18n] translateOnCreate: namePromptBuilt', { promptLength: namePrompt.length });
  const nameTranslations = await translateWithGemini(namePrompt, apiKey);
  winston.info('[community-i18n] translateOnCreate: nameTranslations', { languages: Object.keys(nameTranslations) });
  let descTranslations = undefined;
  if (typeof description === 'string' && description.trim()) {
    const descPrompt = buildPrompt('description', description.trim());
    winston.info('[community-i18n] translateOnCreate: descPromptBuilt', { promptLength: descPrompt.length });
    descTranslations = await translateWithGemini(descPrompt, apiKey);
    winston.info('[community-i18n] translateOnCreate: descTranslations', { languages: Object.keys(descTranslations) });
  }
  return { nameTranslations, descTranslations };
}

async function saveTranslations(cid, translations) {
  const { nameTranslations, descTranslations } = translations || {};
  if (!cid || !nameTranslations) {
    throw new Error('Invalid parameters for saveTranslations');
  }
  winston.info('[community-i18n] saveTranslations: begin', {
    cid,
    nameLangs: Object.keys(nameTranslations || {}),
    descLangs: Object.keys(descTranslations || {}),
  });
  // Persist under category hash fields (no fallbacks)
  for (const lang of LANG_KEYS) {
    await data.setObjectField(`category:${cid}`, `i18n:name:${lang}`, nameTranslations[lang]);
    if (descTranslations) {
      await data.setObjectField(`category:${cid}`, `i18n:description:${lang}`, descTranslations[lang]);
    }
  }
  winston.info(`[plugin/caiz] Saved i18n translations for community ${cid}`);
}

module.exports = {
  LANG_KEYS,
  translateOnCreate,
  saveTranslations,
};
