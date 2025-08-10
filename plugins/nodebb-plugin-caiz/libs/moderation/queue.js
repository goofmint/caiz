const db = require.main.require('./src/database');
const winston = require.main.require('winston');
const ModerationService = require('./service');

/**
 * Moderation Queue Management
 * Handles database operations for moderation queue
 */

class ModerationQueue {
  constructor() {
    this.moderationService = new ModerationService();
  }

  async addToQueue(postData, moderationResult, threshold) {
    winston.info(`[moderation] Adding post ${postData.pid} to moderation queue`);
    
    const queueEntry = {
      pid: postData.pid,
      cid: postData.cid,
      uid: postData.uid,
      content: postData.content,
      ai_score: moderationResult.normalizedScore,
      risk_categories: JSON.stringify(moderationResult.categories),
      threshold_used: threshold,
      status: moderationResult.normalizedScore >= 90 ? 'rejected' : 'pending'
    };

    const query = `
      INSERT INTO moderation_queue 
      (pid, cid, uid, content, ai_score, risk_categories, threshold_used, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const values = [
      queueEntry.pid,
      queueEntry.cid, 
      queueEntry.uid,
      queueEntry.content,
      queueEntry.ai_score,
      queueEntry.risk_categories,
      queueEntry.threshold_used,
      queueEntry.status
    ];

    try {
      const result = await db.query(query, values);
      const queueId = result.rows[0].id;
      
      winston.info(`[moderation] Post ${postData.pid} added to queue with ID ${queueId}, status: ${queueEntry.status}`);
      return queueId;
    } catch (error) {
      winston.error(`[moderation] Failed to add post to queue:`, error);
      throw error;
    }
  }

  async getPendingPosts(cid, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT mq.*, u.username, u.userslug, u.picture
      FROM moderation_queue mq
      JOIN users u ON mq.uid = u.uid
      WHERE mq.cid = $1 AND mq.status = 'pending'
      ORDER BY mq.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [cid, limit, offset]);
      return result.rows.map(row => ({
        ...row,
        risk_categories: JSON.parse(row.risk_categories || '{}'),
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString()
      }));
    } catch (error) {
      winston.error(`[moderation] Failed to get pending posts:`, error);
      throw error;
    }
  }

  async getPendingCount(cid) {
    const query = `
      SELECT COUNT(*) as count
      FROM moderation_queue
      WHERE cid = $1 AND status = 'pending'
    `;

    try {
      const result = await db.query(query, [cid]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      winston.error(`[moderation] Failed to get pending count:`, error);
      return 0;
    }
  }

  async reviewPost(pid, action, reviewerUid, reason = null) {
    winston.info(`[moderation] Reviewing post ${pid}: ${action} by user ${reviewerUid}`);
    
    if (!['approve', 'reject'].includes(action)) {
      throw new Error('Invalid action. Must be "approve" or "reject"');
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const query = `
      UPDATE moderation_queue 
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(), reason = $3
      WHERE pid = $4 AND status = 'pending'
      RETURNING *
    `;

    try {
      const result = await db.query(query, [status, reviewerUid, reason, pid]);
      
      if (result.rows.length === 0) {
        throw new Error('Post not found in pending moderation queue');
      }

      winston.info(`[moderation] Post ${pid} ${action}ed by user ${reviewerUid}`);
      return result.rows[0];
    } catch (error) {
      winston.error(`[moderation] Failed to review post:`, error);
      throw error;
    }
  }

  async getQueueStats(cid, days = 7) {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(ai_score) as avg_score
      FROM moderation_queue 
      WHERE cid = $1 
        AND created_at > NOW() - INTERVAL '${days} days'
      GROUP BY status
    `;

    try {
      const result = await db.query(query, [cid]);
      
      const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        avgScore: 0
      };

      let totalPosts = 0;
      let totalScore = 0;

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        const avgScore = parseFloat(row.avg_score) || 0;
        
        stats[row.status] = count;
        totalPosts += count;
        totalScore += avgScore * count;
      });

      stats.total = totalPosts;
      stats.avgScore = totalPosts > 0 ? Math.round(totalScore / totalPosts) : 0;

      return stats;
    } catch (error) {
      winston.error(`[moderation] Failed to get queue stats:`, error);
      return { pending: 0, approved: 0, rejected: 0, total: 0, avgScore: 0 };
    }
  }

  async cleanupOldEntries(daysOld = 30) {
    winston.info(`[moderation] Cleaning up moderation queue entries older than ${daysOld} days`);
    
    const query = `
      DELETE FROM moderation_queue 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        AND status IN ('approved', 'rejected')
    `;

    try {
      const result = await db.query(query);
      winston.info(`[moderation] Cleaned up ${result.rowCount} old moderation entries`);
      return result.rowCount;
    } catch (error) {
      winston.error(`[moderation] Failed to cleanup old entries:`, error);
      throw error;
    }
  }
}

module.exports = ModerationQueue;