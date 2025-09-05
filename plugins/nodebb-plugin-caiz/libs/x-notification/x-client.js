'use strict';

const xConfig = require('./x-config');
const xAuth = require('./x-auth');

const xClient = {};

xClient.postToX = async (cid, message) => {
  const account = await xConfig.getSelectedAccount(cid);
  
  if (!account) {
    throw new Error('[[x-notification:error.no-account-selected]]');
  }
  
  // Check if token needs refresh
  let accessToken = account.accessToken;
  if (account.expiresAt && Date.now() >= account.expiresAt - 60000) {
    // Refresh token if expires in less than 1 minute
    try {
      const newTokens = await xAuth.refreshAccessToken(account.refreshToken);
      
      // Update account with new tokens
      await xConfig.addAccount(cid, {
        ...account,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || account.refreshToken,
        expiresAt: Date.now() + (newTokens.expires_in * 1000)
      });
      
      accessToken = newTokens.access_token;
    } catch (err) {
      console.error('[x-notification] Token refresh failed:', err);
      throw new Error('[[x-notification:error.token-refresh-failed]]');
    }
  }
  
  // Truncate message if too long (X has 280 character limit)
  const truncatedMessage = message.length > 280 ? message.substring(0, 277) + '...' : message;
  
  const response = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: truncatedMessage
    })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('[[x-notification:error.unauthorized]]');
    }
    throw new Error(`X API tweet failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data;
};

xClient.formatMessage = (template, data) => {
  let message = template;
  
  // Replace placeholders
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    message = message.replace(regex, data[key] || '');
  });
  
  return message;
};

module.exports = xClient;