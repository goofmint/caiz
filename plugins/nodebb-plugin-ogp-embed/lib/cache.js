'use strict';

const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const settings = require('./settings');

class OGPCache {
    constructor() {
        this.keyPrefix = 'ogp-embed:cache:';
    }

    /**
     * Get TTL from settings
     * @returns {number} TTL in milliseconds
     */
    async getTTL() {
        return await settings.getCacheTTL();
    }

    /**
     * Initialize cache
     */
    async initialize() {
        winston.info('[ogp-embed] Cache initialized');
    }

    /**
     * Get from cache
     * @param {string} url
     * @returns {Object|null}
     */
    async get(url) {
        try {
            const key = this.getCacheKey(url);
            const cached = await db.getObject(key);
            
            if (!cached) {
                return null;
            }
            
            // Check if expired
            if (cached.expiry && cached.expiry < Date.now()) {
                winston.info(`[ogp-embed] Cache expired for: ${url}`);
                await this.clear(url);
                return null;
            }
            
            // Parse JSON data if stored as string
            let data = cached.data;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (parseErr) {
                    winston.error(`[ogp-embed] Cache parse error for ${url}: ${parseErr.message}`);
                    return null;
                }
            }
            
            winston.info(`[ogp-embed] Cache hit for: ${url}`);
            return data;
            
        } catch (err) {
            winston.error(`[ogp-embed] Cache get error: ${err.message}`);
            return null;
        }
    }

    /**
     * Save to cache
     * @param {string} url
     * @param {Object} data
     */
    async set(url, data) {
        try {
            const key = this.getCacheKey(url);
            const ttl = await this.getTTL();
            const cacheData = {
                data: JSON.stringify(data),
                expiry: Date.now() + ttl,
                created: Date.now()
            };
            
            await db.setObject(key, cacheData);
            
            // Add to index for tracking
            await db.sortedSetAdd(this.keyPrefix + 'index', Date.now(), key);
            
            // Set expiry in Redis (if using Redis)
            if (db.client && db.client.pexpire) {
                await db.client.pexpire(key, ttl);
            }
            
            winston.info(`[ogp-embed] Cached data for: ${url}`);
            
        } catch (err) {
            winston.error(`[ogp-embed] Cache set error: ${err.message}`);
        }
    }

    /**
     * Clear cache for specific URL
     * @param {string} url
     */
    async clear(url) {
        try {
            const key = this.getCacheKey(url);
            await db.delete(key);
            
            // Remove from index to keep it in sync
            await db.sortedSetRemove(this.keyPrefix + 'index', key);
            
            winston.info(`[ogp-embed] Cleared cache for: ${url}`);
        } catch (err) {
            winston.error(`[ogp-embed] Cache clear error: ${err.message}`);
        }
    }

    /**
     * Clear all cache
     */
    async clearAll() {
        try {
            // Get all cache keys
            const keys = await db.getSortedSetRange(this.keyPrefix + 'index', 0, -1);
            
            if (keys && keys.length > 0) {
                // Delete all cache entries
                await Promise.all(keys.map(key => db.delete(key)));
                
                // Clear index
                await db.delete(this.keyPrefix + 'index');
            }
            
            winston.info('[ogp-embed] Cleared all cache');
        } catch (err) {
            winston.error(`[ogp-embed] Clear all cache error: ${err.message}`);
        }
    }

    /**
     * Generate cache key from URL
     * @param {string} url
     * @returns {string}
     */
    getCacheKey(url) {
        // Create a simple hash for the URL to use as key
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(url).digest('hex');
        return this.keyPrefix + hash;
    }
}

module.exports = new OGPCache();