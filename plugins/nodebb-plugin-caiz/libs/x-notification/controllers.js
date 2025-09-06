'use strict';

const xSettings = require('./settings');
const xAuth = require('./x-auth');
const xConfig = require('./x-config');
const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

const controllers = {};

controllers.handleOAuthCallback = async (req, res) => {
  const { code, state } = req.query;
  winston.info(`[x-oauth] callback received state=${state ? String(state) : 'null'} code=${code ? 'present' : 'missing'}`);
  
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }
  
  try {
    // Validate state and retrieve claims (cid, uid, codeVerifier)
    const { cid, uid, codeVerifier } = await xAuth.getStateClaims(state);
    winston.info(`[x-oauth] callback claims state=${state} cid=${cid} uid=${uid}`);

    // Verify the initiator is still owner of the community
    const isOwner = await xConfig.isCommunityOwner(cid, uid);
    if (!isOwner) {
      winston.warn(`[x-oauth] non-owner callback blocked cid=${cid} uid=${uid}`);
      return res.status(403).json({ error: '[[error:no-privileges]]' });
    }

    // Exchange code for tokens only after ownership is verified
    const tokens = await xAuth.exchangeCodeForTokens(code, codeVerifier);
    winston.info(`[x-oauth] token exchange success cid=${cid} uid=${uid} scope=${tokens && tokens.scope}`);
    
    // Save account to community config
    const accountData = {
      accountId: `x_${Date.now()}_${cid}`,
      screenName: 'Connected Account',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scopes: tokens.scope ? tokens.scope.split(' ') : ['tweet.write']
    };
    
    // reduced logging
    
    await xConfig.addAccount(cid, accountData);
    winston.info(`[x-oauth] account persisted cid=${cid} accountId=${accountData.accountId}`);
    // reduced logging
    
    // Redirect back to community page with success message (same as Slack/Discord)
    const nconf = require.main.require('nconf');
    const url = nconf.get('url');
    
    // Get community handle for redirect
    const db = require.main.require('./src/database');
    const handle = await db.getObjectField(`category:${cid}`, 'handle');
    
    // Build redirect URL with success parameters
    const redirectUrl = `${url}/${handle}?x_success=1&account=${encodeURIComponent('Connected Account')}`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('[caiz] X OAuth callback error:', err);
    res.status(500).json({ error: err.message });
  }
};

controllers.getXSettings = async (req, res) => {
  const { cid } = req.params;
  const uid = req.uid;
  
  // Check if user is community owner
  const isOwner = await xConfig.isCommunityOwner(cid, uid);
  if (!isOwner) {
    return res.status(403).json({ error: '[[error:no-privileges]]' });
  }
  
  const config = await xConfig.getConfig(cid);
  
  // Mask tokens for security
  if (config.accounts) {
    config.accounts = config.accounts.map(account => ({
      ...account,
      accessToken: '********',
      refreshToken: '********'
    }));
  }
  
  res.json(config);
};

controllers.saveXSettings = async (req, res) => {
  const { cid } = req.params;
  const uid = req.uid;
  const { selectedAccountId, events, templates } = req.body;
  
  const isOwner = await xConfig.isCommunityOwner(cid, uid);
  if (!isOwner) {
    return res.status(403).json({ error: '[[error:no-privileges]]' });
  }
  
  await xConfig.updateConfig(cid, {
    selectedAccountId,
    events,
    templates
  });
  
  res.json({ success: true });
};

controllers.startXConnect = async (req, res) => {
  const { cid } = req.params;
  const uid = req.uid;
  
  const isOwner = await xConfig.isCommunityOwner(cid, uid);
  if (!isOwner) {
    return res.status(403).json({ error: '[[error:no-privileges]]' });
  }
  
  const authUrl = await xAuth.getAuthorizationUrl(cid, uid);
  res.json({ authUrl });
};

controllers.deleteXAccount = async (req, res) => {
  const { cid, accountId } = req.params;
  const uid = req.uid;
  
  const isOwner = await xConfig.isCommunityOwner(cid, uid);
  if (!isOwner) {
    return res.status(403).json({ error: '[[error:no-privileges]]' });
  }
  
  await xConfig.removeAccount(cid, accountId);
  res.json({ success: true });
};

controllers.sendTestPost = async (req, res) => {
  const { cid } = req.params;
  const uid = req.uid;
  const { message } = req.body;
  
  const isOwner = await xConfig.isCommunityOwner(cid, uid);
  if (!isOwner) {
    return res.status(403).json({ error: '[[error:no-privileges]]' });
  }
  
  try {
    const xClient = require('./x-client');
    const result = await xClient.postToX(cid, message || 'Test post from NodeBB');
    res.json({ success: true, postId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = controllers;
