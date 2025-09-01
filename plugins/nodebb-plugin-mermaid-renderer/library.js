"use strict";

const winston = require.main.require('winston');

// Hard limits (no fallbacks)
const SETTINGS = Object.freeze({
  enabled: true,
  maxInputChars: 5000,
  renderTimeoutMs: 8000,
  theme: 'default',
  securityLevel: 'strict',
});

// Regex to detect fenced code blocks ```mermaid ... ```
const RE_FENCE = /```\s*mermaid\s*
([\s\S]*?)```/g;

function toBase64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeMermaid(code) {
  const s = String(code || '');
  if (!s.trim()) throw new Error('Empty mermaid code');
  if (s.length > SETTINGS.maxInputChars) throw new Error(`Code too long (${s.length})`);
  // Disallow HTML tags to prevent injection
  if (/[<][\s\S]*?>/.test(s)) throw new Error('HTML tags are not allowed in mermaid code');
  return s;
}

function replaceWithPlaceholders(html) {
  let idx = 0;
  const blocks = [];
  const out = html.replace(RE_FENCE, (_, code) => {
    try {
      const clean = sanitizeMermaid(code);
      const id = `mermaid-${Date.now()}-${idx++}`;
      const b64 = toBase64(clean);
      blocks.push({ id, code: b64 });
      return `<div class="mermaid-render" data-mermaid-id="${id}" data-mermaid-code="${b64}" data-theme="${SETTINGS.theme}" data-sec="${SETTINGS.securityLevel}" data-timeout="${SETTINGS.renderTimeoutMs}"></div>`;
    } catch (err) {
      const msg = String(err.message || 'Invalid mermaid');
      return `<div class="mermaid-render mermaid-error"><pre>${escapeHtml(msg)}</pre></div>`;
    }
  });
  return { html: out, blocks };
}

const plugin = {};

plugin.onFilterParsePost = async function (data) {
  try {
    if (!SETTINGS.enabled) return data;
    const post = data && data.postData;
    if (!post || typeof post.content !== 'string') return data;
    const { html } = replaceWithPlaceholders(post.content);
    post.content = html;
  } catch (err) {
    winston.error('[mermaid] parse error:', err.message);
  }
  return data;
};

module.exports = plugin;
