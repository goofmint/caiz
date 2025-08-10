const db = require.main.require('./src/database');
const winston = require.main.require('winston');

/**
 * Community Moderation Settings Management
 * Handles CRUD operations for moderation settings
 */

class ModerationSettings {
  async getSettings(cid) {
    const query = `
      SELECT * FROM community_moderation_settings 
      WHERE cid = $1
    `;

    try {
      const result = await db.query(query, [cid]);
      
      if (result.rows.length === 0) {
        // Create default settings if none exist
        return await this.createDefaultSettings(cid);
      }

      const settings = result.rows[0];
      return {
        cid: settings.cid,
        enabled: settings.enabled,
        thresholdModerate: settings.threshold_moderate,
        thresholdReject: settings.threshold_reject,
        autoApproveTrusted: settings.auto_approve_trusted,
        notifyManagers: settings.notify_managers,
        categories: {
          harassment: settings.harassment_enabled,
          hate: settings.hate_enabled,
          violence: settings.violence_enabled,
          sexual: settings.sexual_enabled,
          spam: settings.spam_enabled,
          misinformation: settings.misinformation_enabled
        },
        settings: settings.settings ? JSON.parse(settings.settings) : {},
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      };
    } catch (error) {
      winston.error(`[moderation] Failed to get settings for cid ${cid}:`, error);
      throw error;
    }
  }

  async createDefaultSettings(cid) {
    winston.info(`[moderation] Creating default settings for community ${cid}`);
    
    const query = `
      INSERT INTO community_moderation_settings (cid)
      VALUES ($1)
      ON CONFLICT (cid) DO NOTHING
      RETURNING *
    `;

    try {
      await db.query(query, [cid]);
      return await this.getSettings(cid);
    } catch (error) {
      winston.error(`[moderation] Failed to create default settings:`, error);
      throw error;
    }
  }

  async updateSettings(cid, settingsUpdate) {
    winston.info(`[moderation] Updating settings for community ${cid}`);
    
    // Build dynamic query based on provided fields
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    if (settingsUpdate.enabled !== undefined) {
      updateFields.push(`enabled = $${valueIndex++}`);
      values.push(settingsUpdate.enabled);
    }

    if (settingsUpdate.thresholdModerate !== undefined) {
      updateFields.push(`threshold_moderate = $${valueIndex++}`);
      values.push(settingsUpdate.thresholdModerate);
    }

    if (settingsUpdate.thresholdReject !== undefined) {
      updateFields.push(`threshold_reject = $${valueIndex++}`);
      values.push(settingsUpdate.thresholdReject);
    }

    if (settingsUpdate.autoApproveTrusted !== undefined) {
      updateFields.push(`auto_approve_trusted = $${valueIndex++}`);
      values.push(settingsUpdate.autoApproveTrusted);
    }

    if (settingsUpdate.notifyManagers !== undefined) {
      updateFields.push(`notify_managers = $${valueIndex++}`);
      values.push(settingsUpdate.notifyManagers);
    }

    // Handle category-specific settings
    if (settingsUpdate.categories) {
      const categories = settingsUpdate.categories;
      
      if (categories.harassment !== undefined) {
        updateFields.push(`harassment_enabled = $${valueIndex++}`);
        values.push(categories.harassment);
      }
      if (categories.hate !== undefined) {
        updateFields.push(`hate_enabled = $${valueIndex++}`);
        values.push(categories.hate);
      }
      if (categories.violence !== undefined) {
        updateFields.push(`violence_enabled = $${valueIndex++}`);
        values.push(categories.violence);
      }
      if (categories.sexual !== undefined) {
        updateFields.push(`sexual_enabled = $${valueIndex++}`);
        values.push(categories.sexual);
      }
      if (categories.spam !== undefined) {
        updateFields.push(`spam_enabled = $${valueIndex++}`);
        values.push(categories.spam);
      }
      if (categories.misinformation !== undefined) {
        updateFields.push(`misinformation_enabled = $${valueIndex++}`);
        values.push(categories.misinformation);
      }
    }

    if (settingsUpdate.settings !== undefined) {
      updateFields.push(`settings = $${valueIndex++}`);
      values.push(JSON.stringify(settingsUpdate.settings));
    }

    if (updateFields.length === 0) {
      winston.warn(`[moderation] No fields to update for cid ${cid}`);
      return await this.getSettings(cid);
    }

    values.push(cid); // Add cid as the last parameter
    
    const query = `
      UPDATE community_moderation_settings 
      SET ${updateFields.join(', ')}
      WHERE cid = $${valueIndex}
    `;

    try {
      await db.query(query, values);
      winston.info(`[moderation] Settings updated for community ${cid}`);
      return await this.getSettings(cid);
    } catch (error) {
      winston.error(`[moderation] Failed to update settings:`, error);
      throw error;
    }
  }

  async isEnabled(cid) {
    try {
      const settings = await this.getSettings(cid);
      return settings.enabled;
    } catch (error) {
      winston.warn(`[moderation] Failed to check if moderation is enabled for cid ${cid}, defaulting to false`);
      return false;
    }
  }

  async getThresholds(cid) {
    try {
      const settings = await this.getSettings(cid);
      return {
        moderate: settings.thresholdModerate,
        reject: settings.thresholdReject
      };
    } catch (error) {
      winston.warn(`[moderation] Failed to get thresholds for cid ${cid}, using defaults`);
      return { moderate: 70, reject: 90 };
    }
  }

  async getEnabledCategories(cid) {
    try {
      const settings = await this.getSettings(cid);
      return Object.entries(settings.categories)
        .filter(([_, enabled]) => enabled)
        .map(([category]) => category);
    } catch (error) {
      winston.warn(`[moderation] Failed to get enabled categories for cid ${cid}, using defaults`);
      return ['harassment', 'hate', 'violence', 'sexual', 'spam', 'misinformation'];
    }
  }

  async getAllSettings() {
    const query = `
      SELECT cid, enabled, threshold_moderate, threshold_reject
      FROM community_moderation_settings
      WHERE enabled = true
    `;

    try {
      const result = await db.query(query);
      return result.rows.map(row => ({
        cid: row.cid,
        enabled: row.enabled,
        thresholdModerate: row.threshold_moderate,
        thresholdReject: row.threshold_reject
      }));
    } catch (error) {
      winston.error(`[moderation] Failed to get all settings:`, error);
      return [];
    }
  }
}

module.exports = ModerationSettings;