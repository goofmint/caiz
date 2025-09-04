'use strict';

const settings = require('./settings');
const xAuth = require('./x-auth');
const xConfig = require('./x-config');
const nconf = require.main.require('nconf');

const controllers = {};

controllers.renderAdminPage = async (req, res) => {
  const config = await settings.get();
  const baseUrl = nconf.get('url');
  
  res.render('admin/plugins/x-notification', {
    clientKey: config.clientKey,
    clientSecret: config.clientSecret ? '********' : '',
    callbackUrl: `${baseUrl}/x-notification/callback`,
    title: 'X Notification Settings'
  });
};

controllers.handleOAuthCallback = async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }
  
  try {
    // Parse state to get cid and uid
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { cid, uid } = stateData;
    
    // Exchange code for tokens
    const tokens = await xAuth.exchangeCodeForTokens(code);
    
    // Get user info from X
    const userInfo = await xAuth.getUserInfo(tokens.access_token);
    
    // Save account to community config
    await xConfig.addAccount(cid, {
      accountId: userInfo.id,
      screenName: userInfo.username,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scopes: tokens.scope ? tokens.scope.split(' ') : ['tweet.read', 'tweet.write', 'users.read']
    });
    
    // Return success page that closes the window
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'x-auth-success', accountId: '${userInfo.id}', screenName: '${userInfo.username}' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[x-notification] OAuth callback error:', err);
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