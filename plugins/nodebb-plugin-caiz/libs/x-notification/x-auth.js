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
  
  // Store code verifier temporarily (in production, use Redis or database)
  const db = require.main.require('./src/database');
  await db.setObjectField(`x-auth:state:${state}`, 'codeVerifier', codeVerifier);
  await db.pexpire(`x-auth:state:${state}`, 600000); // 10 minutes
  
  const baseUrl = nconf.get('url');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientKey,
    redirect_uri: `${baseUrl}/x-notification/callback`,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
};

xAuth.exchangeCodeForTokens = async (code) => {
  const meta = require.main.require('./src/meta');
  const clientKey = await meta.settings.getOne('caiz', 'oauth:x:clientKey');
  const clientSecret = await meta.settings.getOne('caiz', 'oauth:x:clientSecret');
  const baseUrl = nconf.get('url');
  
  // Retrieve code verifier from state
  const db = require.main.require('./src/database');
  const stateData = await db.getObjectField(`x-auth:state:${code}`, 'codeVerifier');
  
  if (!stateData) {
    throw new Error('Invalid state');
  }
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: `${baseUrl}/x-notification/callback`,
    code_verifier: stateData
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
    throw new Error(`X OAuth token exchange failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Clean up state
  await db.delete(`x-auth:state:${code}`);
  
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

xAuth.getUserInfo = async (accessToken) => {
  const response = await fetch('https://api.x.com/2/users/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`X API user info failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data;
};

module.exports = xAuth;