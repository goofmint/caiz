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

// Regex to detect fenced code blocks ```mermaid ... ``` (extendable)
const RE_MERMAID = /```\s*mermaid\s*\n([\s\S]*?)```/g;

function toBase64(str) { return Buffer.from(str, 'utf8').toString('base64'); }
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function sanitize(code) {
  const s = String(code || '');
  if (!s.trim()) throw new Error('Empty code');
  if (s.length > SETTINGS.maxInputChars) throw new Error(`Code too long (${s.length})`);
  if (/[<][\s\S]*?>/.test(s)) throw new Error('HTML tags are not allowed');
  return s;
}
function replaceMermaid(html) {
  let idx = 0;
  const out = html.replace(RE_MERMAID, (_, code) => {
    try {
      const clean = sanitize(code);
      const id = `mermaid-${Date.now()}-${idx++}`;
      const b64 = toBase64(clean);
      return `<div class="mermaid-render" data-mermaid-id="${id}" data-mermaid-code="${b64}" data-theme="${SETTINGS.theme}" data-sec="${SETTINGS.securityLevel}" data-timeout="${SETTINGS.renderTimeoutMs}"></div>`;
    } catch (err) {
      return `<div class="mermaid-render mermaid-error"><pre>${escapeHtml(err.message || 'Invalid code')}</pre></div>`;
    }
  });
  return out;
}

const plugin = {};
plugin.onFilterParsePost = async function (data) {
  try {
    if (!SETTINGS.enabled) return data;
    const post = data && data.postData;
    if (!post || typeof post.content !== 'string') return data;
    post.content = replaceMermaid(post.content);
  } catch (err) {
    winston.error('[extra-renderer] parse error:', err.message);
  }
  return data;
};

module.exports = plugin;
