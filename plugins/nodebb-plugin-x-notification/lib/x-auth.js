'use strict';

const crypto = require('crypto');
const axios = require('axios');
const settings = require('./settings');
const nconf = require.main.require('nconf');

const xAuth = {};

// OAuth 2.0 PKCE implementation for X API v2
xAuth.getAuthorizationUrl = async (cid, uid) => {
  const config = await settings.getDecrypted();
  
  if (!config.clientKey) {
    throw new Error('[[x-notification:error.no-client-key]]');
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
    client_id: config.clientKey,
    redirect_uri: `${baseUrl}/x-notification/callback`,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
};

xAuth.exchangeCodeForTokens = async (code) => {
  const config = await settings.getDecrypted();
  const baseUrl = nconf.get('url');
  
  // Retrieve code verifier from state
  const db = require.main.require('./src/database');
  const stateData = await db.getObjectField(`x-auth:state:${code}`, 'codeVerifier');
  
  if (!stateData) {
    throw new Error('[[x-notification:error.invalid-state]]');
  }
  
  const response = await axios.post('https://api.twitter.com/2/oauth2/token', 
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${baseUrl}/x-notification/callback`,
      code_verifier: stateData
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.clientKey}:${config.clientSecret}`).toString('base64')}`
      }
    }
  );
  
  // Clean up state
  await db.delete(`x-auth:state:${code}`);
  
  return response.data;
};

xAuth.refreshAccessToken = async (refreshToken) => {
  const config = await settings.getDecrypted();
  
  const response = await axios.post('https://api.twitter.com/2/oauth2/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.clientKey}:${config.clientSecret}`).toString('base64')}`
      }
    }
  );
  
  return response.data;
};

xAuth.getUserInfo = async (accessToken) => {
  const response = await axios.get('https://api.twitter.com/2/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  return response.data.data;
};

module.exports = xAuth;