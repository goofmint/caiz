'use strict';

const OpenAIModerator = require('./openai');
const logger = require.main.require('./src/logger');

class ModerationAPIFactory {
    constructor() {
        this.providers = new Map();
        this.registerProvider('openai', OpenAIModerator);
    }

    registerProvider(name, ProviderClass) {
        this.providers.set(name, ProviderClass);
        logger.info(`[ai-moderation] Registered provider: ${name}`);
    }

    createModerator(provider, apiKey, options = {}) {
        if (!this.providers.has(provider)) {
            throw new Error(`Unknown moderation provider: ${provider}`);
        }

        const ProviderClass = this.providers.get(provider);
        return new ProviderClass(apiKey, options);
    }

    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }

    async testProvider(provider, apiKey) {
        try {
            const moderator = this.createModerator(provider, apiKey);
            return await moderator.testConnection();
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// シングルトンインスタンス
const factory = new ModerationAPIFactory();

module.exports = factory;