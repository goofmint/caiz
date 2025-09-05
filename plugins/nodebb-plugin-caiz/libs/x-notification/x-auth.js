'use strict';

const crypto = require('crypto');
const xSettings = require('./settings');
const nconf = require.main.require('nconf');

const xAuth = {};

// OAuth 2.0 PKCE implementation for X API v2
xAuth.getAuthorizationUrl = async (cid, uid) => {
  const meta = require.main.require('./src/meta');
  const clientKey = await meta.settings.getOne('caiz', 'oauth:x:clientKey');
  
  if (!clientKey) {
    throw new Error('X Client Key not configured');
  }
  
  // Generate PKCE challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  // Generate state
  const state = Buffer.from(JSON.stringify({ cid, uid, codeVerifier })).toString('base64');
  
  // Store state claims temporarily (in production, use Redis or database)
  const db = require.main.require('./src/database');
  await db.setObjectField(`x-auth:state:${state}`, 'codeVerifier', codeVerifier);
  await db.setObjectField(`x-auth:state:${state}`, 'cid', String(cid));
  await db.setObjectField(`x-auth:state:${state}`, 'uid', String(uid));
  await db.pexpire(`x-auth:state:${state}`, 600000); // 10 minutes
  
  const baseUrl = nconf.get('url');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientKey,
    redirect_uri: `${baseUrl}/caiz/oauth/x/callback`,
    // Request full set of scopes recommended for posting via user context
    // Ref: X API v2 OAuth 2.0 scopes
    scope: 'tweet.read tweet.write users.read offline.access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
};

xAuth.getStateClaims = async (state) => {
  if (!state || typeof state !== 'string') {
    throw new Error('Invalid state');
  }
  const db = require.main.require('./src/database');
  const [codeVerifier, cid, uid] = await Promise.all([
    db.getObjectField(`x-auth:state:${state}`, 'codeVerifier'),
    db.getObjectField(`x-auth:state:${state}`, 'cid'),
    db.getObjectField(`x-auth:state:${state}`, 'uid'),
  ]);
  if (!codeVerifier || !cid || !uid) {
    throw new Error('Invalid state');
  }
  // Consume state to prevent replay
  await db.delete(`x-auth:state:${state}`);
  return { codeVerifier, cid: parseInt(cid, 10), uid: parseInt(uid, 10) };
};

xAuth.exchangeCodeForTokens = async (code, codeVerifier) => {
  const meta = require.main.require('./src/meta');
  const clientKey = await meta.settings.getOne('caiz', 'oauth:x:clientKey');
  const clientSecret = await meta.settings.getOne('caiz', 'oauth:x:clientSecret');
  const baseUrl = nconf.get('url');
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: `${baseUrl}/caiz/oauth/x/callback`,
    code_verifier: codeVerifier
  });
  
  // reduced logging

  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientKey}:${clientSecret}`).toString('base64')}`
    },
    body: params.toString()
  });
  
  // reduced logging
  
  if (!response.ok) {
    const errorBody = await response.text();
    // reduced logging of error body
    throw new Error(`X OAuth token exchange failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  // reduced logging
  
  return data;
};

xAuth.refreshAccessToken = async (refreshToken) => {
  const meta = require.main.require('./src/meta');
  const clientKey = await meta.settings.getOne('caiz', 'oauth:x:clientKey');
  const clientSecret = await meta.settings.getOne('caiz', 'oauth:x:clientSecret');
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  
  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientKey}:${clientSecret}`).toString('base64')}`
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    throw new Error(`X OAuth token refresh failed: ${response.statusText}`);
  }
  
  return await response.json();
};


module.exports = xAuth;
