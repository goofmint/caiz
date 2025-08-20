const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const Categories = require.main.require('./src/categories');

/**
 * Base class for notification handlers
 * Provides common functionality for Slack, Discord, and other platforms
 */
class NotifierBase {
    constructor() {
        this.baseUrl = nconf.get('url');
    }

    /**
     * Find the root community (parentCid === 0)
     * @param {number} cid - Category ID
     * @returns {Object|null} Root community data
     */
    async findRootCommunity(cid) {
        try {
            let categoryData = await Categories.getCategoryData(cid);
            let communityData = null;
            
            // Traverse up the category tree to find the root community
            while (categoryData) {
                if (categoryData.parentCid === 0) {
                    communityData = categoryData;
                    break;
                }
                categoryData = await Categories.getCategoryData(categoryData.parentCid);
            }
            
            if (!communityData) {
                winston.warn(`[NotifierBase] No root community found for category ${cid}`);
            }
            
            return communityData;
        } catch (err) {
            winston.error(`[NotifierBase] Error finding root community: ${err.message}`);
            return null;
        }
    }

    /**
     * Get topic category data (for displaying category name in notifications)
     * @param {number} cid - Category ID
     * @returns {Object|null} Category data
     */
    async getCategoryData(cid) {
        try {
            return await Categories.getCategoryData(cid);
        } catch (err) {
            winston.error(`[NotifierBase] Error getting category data: ${err.message}`);
            return null;
        }
    }

    /**
     * Decode HTML entities
     * @param {string} text - Text with HTML entities
     * @returns {string} Decoded text
     */
    decodeHtmlEntities(text) {
        if (!text) return text;
        
        // Common HTML entities
        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&#039;': "'",
            '&nbsp;': ' ',
            '&#x2F;': '/',
            '&#x60;': '`',
            '&#x3D;': '='
        };
        
        // Replace named and numeric entities
        let decoded = text;
        for (const [entity, char] of Object.entries(entities)) {
            decoded = decoded.replace(new RegExp(entity, 'g'), char);
        }
        
        // Handle numeric entities (e.g., &#123;)
        decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
            return String.fromCharCode(dec);
        });
        
        // Handle hex entities (e.g., &#x2F;)
        decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
        
        return decoded;
    }

    /**
     * Format content preview (strip HTML and truncate)
     * @param {string} content - HTML content
     * @param {number} maxLength - Maximum length (default 200)
     * @returns {string} Plain text preview
     */
    formatContentPreview(content, maxLength = 200) {
        if (!content) return '';
        
        // Strip HTML tags
        let plainText = content.replace(/<[^>]*>/g, '');
        
        // Decode HTML entities
        plainText = this.decodeHtmlEntities(plainText);
        
        // Normalize whitespace
        plainText = plainText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Truncate if needed
        if (plainText.length > maxLength) {
            plainText = plainText.substring(0, maxLength - 3) + '...';
        }
        
        return plainText;
    }

    /**
     * Check notification settings (must be implemented by subclasses)
     * @abstract
     * @param {number} cid - Community ID
     * @param {string} notificationType - Type of notification
     */
    async checkNotificationSettings(cid, notificationType) {
        throw new Error('checkNotificationSettings must be implemented by subclass');
    }

    /**
     * Send message (must be implemented by subclasses)
     * @abstract
     * @param {Object} settings - Platform-specific settings
     * @param {Object} message - Message to send
     */
    async sendMessage(settings, message) {
        throw new Error('sendMessage must be implemented by subclass');
    }
}

module.exports = NotifierBase;