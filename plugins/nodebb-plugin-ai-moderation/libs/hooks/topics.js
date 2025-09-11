'use strict';

const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const Topics = require.main.require('./src/topics');
const Groups = require.main.require('./src/groups');
const Flags = require.main.require('./src/flags');
const ContentAnalyzer = require('../core/analyzer');

const analyzer = new ContentAnalyzer();

const dedupe = new Map();
const lastModerationByTopic = new Map();
const lastModerationByUser = new Map();

function normalize(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/^#+\s*/gm, '').replace(/[\*_`~]/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function diffMetrics(a, b) {
  const aa = normalize(a), bb = normalize(b);
  const maxLen = Math.max(aa.length, bb.length);
  let diff = 0; const minLen = Math.min(aa.length, bb.length);
  for (let i = 0; i < minLen; i++) if (aa[i] !== bb[i]) diff++;
  diff += Math.abs(aa.length - bb.length);
  return { relative: maxLen ? diff / maxLen : 0, absolute: diff };
}
function significant(a, b, th) {
  const m = diffMetrics(a, b);
  return m.relative >= th.relative || m.absolute >= th.absolute;
}
async function getEditCfg() {
  const s = await meta.settings.get('ai-moderation') || {};
  if (!('edit.enabled' in s)) throw new Error('[ai-moderation] Missing setting: edit.enabled');
  if (!('edit.minChange.relative' in s) || !('edit.minChange.absolute' in s)) throw new Error('[ai-moderation] Missing setting: edit.minChange.relative/absolute');
  if (!('edit.cooldownSecs' in s)) throw new Error('[ai-moderation] Missing setting: edit.cooldownSecs');
  if (!('edit.excludedRoles' in s)) throw new Error('[ai-moderation] Missing setting: edit.excludedRoles');
  const enabled = String(s['edit.enabled']) === 'true' || String(s['edit.enabled']) === '1';
  const threshold = { relative: Number(s['edit.minChange.relative']), absolute: Number(s['edit.minChange.absolute']) };
  const cooldownMs = Number(s['edit.cooldownSecs']) * 1000;
  const excludedRoles = String(s['edit.excludedRoles'] || '').split(',').map(x => x.trim()).filter(Boolean);
  if (Number.isNaN(threshold.relative) || Number.isNaN(threshold.absolute) || Number.isNaN(cooldownMs)) {
    throw new Error('[ai-moderation] Invalid numeric edit.* settings');
  }
  return { enabled, threshold, cooldownMs, excludedRoles };
}

module.exports = {
  async moderateTopicEdit(hookData) {
    try {
      const topic = hookData && hookData.topic;
      if (!topic || !topic.tid) return hookData;
      const cfg = await getEditCfg();
      if (!cfg.enabled) return hookData;

      // roles
      if (cfg.excludedRoles.length) {
        const memberships = await Groups.getUserGroups([topic.uid]);
        const groups = Array.isArray(memberships) && memberships[0] ? memberships[0].map(g => g && (g.displayName || g.name)).filter(Boolean) : [];
        if (groups.some(name => cfg.excludedRoles.includes(name))) return hookData;
      }

      const now = Date.now();
      const lastT = lastModerationByTopic.get(topic.tid) || 0;
      const lastU = lastModerationByUser.get(topic.uid) || 0;
      if ((now - lastT) < cfg.cooldownMs || (now - lastU) < cfg.cooldownMs) return hookData;

      const key = `remod:topic:${topic.tid}`;
      for (const [k, exp] of dedupe.entries()) { if (exp <= now) dedupe.delete(k); }
      const expAt = dedupe.get(key) || 0;
      if (expAt > now) return hookData;
      dedupe.set(key, now + Math.max(1000, Math.min(cfg.cooldownMs, 5000)));

      const prevTitle = await Topics.getTopicField(topic.tid, 'title');
      if (!significant(String(prevTitle || ''), String(topic.title || ''), cfg.threshold)) return hookData;

      const analysis = await analyzer.analyzeContent({ content: `# ${String(topic.title || '')}`, contentType: 'topic', contentId: topic.tid, uid: topic.uid });
      const settings = require('../core/settings');
      const cur = await settings.getSettings();
      const actorUid = cur.flagUid || 1;
      if (analysis.action === 'flagged' || analysis.action === 'rejected') {
        // create a topic-level flag is not directly supported; flag main post is out-of-scope here
        winston.info('[ai-moderation] Topic flagged on edit (title)', { tid: topic.tid, score: analysis.score });
      } else {
        // improvement path: nothing to resolve at topic level here
        winston.info('[ai-moderation] Topic title improved on edit', { tid: topic.tid });
      }
      lastModerationByTopic.set(topic.tid, now);
      lastModerationByUser.set(topic.uid, now);
    } catch (err) {
      winston.error('[ai-moderation] Error during topic edit remoderation', { error: err.message });
    }
    return hookData;
  }
};

