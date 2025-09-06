'use strict';

(function() {
    let alerts = null;
    
    // Load alerts module once
    require(['alerts'], function(alertsModule) {
        alerts = alertsModule;
    });
    
    class XManager {
        constructor(cid) {
            this.cid = cid;
            this.isConnected = false;
            this.accountName = null;
            this.accountId = null;
            this.connectedAt = null;
            this.init();
        }
        
        init() {
            this.checkConnectionStatus();
            this.attachEventHandlers();
            this.checkOAuthResult();
        }
        
        checkOAuthResult() {
            const urlParams = new URLSearchParams(window.location.search);
            
            if (urlParams.get('x_success')) {
                const accountName = urlParams.get('account');
                this.showConnectedState({ 
                    accountId: 'connected', 
                    screenName: decodeURIComponent(accountName || 'Connected Account') 
                });
                if (alerts) {
                    require(['translator'], function(translator) {
                        translator.translate('[[caiz:x-connected-successfully]]', function(translated) {
                            alerts.success(translated);
                        });
                    });
                }
                // Clean URL
                this.cleanUrl();
            }
            
            if (urlParams.get('x_error')) {
                this.showDisconnectedState();
                if (alerts) {
                    require(['translator'], function(translator) {
                        translator.translate('[[caiz:x-connection-failed-message]]', function(translated) {
                            alerts.error(translated);
                        });
                    });
                }
                // Clean URL
                this.cleanUrl();
            }
        }
        
        cleanUrl() {
            const url = new URL(window.location);
            url.searchParams.delete('x_success');
            url.searchParams.delete('x_error');
            url.searchParams.delete('account');
            window.history.replaceState({}, document.title, url.toString());
        }
        
        async checkConnectionStatus() {
            try {
                const status = await new Promise((resolve, reject) => {
                    window.socket.emit('plugins.caiz.getXNotificationSettings', { cid: this.cid }, (err, data) => {
                        if (err) return reject(err);
                        resolve(data);
                    });
                });
                
                if (status.accounts && status.accounts.length > 0 && status.selectedAccountId) {
                    const selectedAccount = status.accounts.find(acc => acc.accountId === status.selectedAccountId);
                    if (selectedAccount) {
                        this.showConnectedState(selectedAccount);
                    } else {
                        this.showDisconnectedState();
                    }
                } else {
                    this.showDisconnectedState();
                }
            } catch (err) {
                console.error('[X] Failed to check connection status:', err);
                this.showDisconnectedState();
            }
        }
        
        showDisconnectedState() {
            $('#x-disconnected').show();
            $('#x-connected').hide();
            $('#x-connecting').hide();
            this.isConnected = false;
        }
        
        showConnectedState(account) {
            $('#x-disconnected').hide();
            $('#x-connected').show();
            $('#x-connecting').hide();
            
            $('#x-account-name').text('@' + account.screenName);
            $('#x-connected-at').text(new Date().toLocaleDateString());
            
            this.isConnected = true;
            this.accountName = account.screenName;
            this.accountId = account.accountId;
        }
        
        showConnectingState() {
            $('#x-disconnected').hide();
            $('#x-connected').hide();
            $('#x-connecting').show();
        }
        
        attachEventHandlers() {
            const self = this;
            
            $('#connect-x').off('click').on('click', function() {
                self.connectToX();
            });
            
            $('#disconnect-x').off('click').on('click', function() {
                self.disconnectFromX();
            });
        }
        
        async connectToX() {
            this.showConnectingState();
            
            try {
                const authData = await new Promise((resolve, reject) => {
                    window.socket.emit('plugins.caiz.getXAuthUrl', { cid: this.cid }, (err, data) => {
                        if (err) return reject(err);
                        resolve(data);
                    });
                });
                
                if (authData.authUrl) {
                    // Redirect to X OAuth (same as Slack/Discord)
                    window.location.href = authData.authUrl;
                }
            } catch (err) {
                console.error('[X] Connection failed:', err);
                this.showDisconnectedState();
                if (alerts) {
                    require(['translator'], function(translator) {
                        translator.translate('[[caiz:x-connection-failed-message]]', function(translated) {
                            alerts.error(translated);
                        });
                    });
                }
            }
        }
        
        async disconnectFromX() {
            const self = this;
            
            require(['translator'], function(translator) {
                translator.translate('[[caiz:confirm-disconnect-x-message]]', function(translated) {
                    bootbox.confirm(translated, function(result) {
                        if (result) {
                            self.performDisconnection();
                        }
                    });
                });
            });
        }
        
        async performDisconnection() {
            try {
                await new Promise((resolve, reject) => {
                    window.socket.emit('plugins.caiz.disconnectXAccount', { 
                        cid: this.cid, 
                        accountId: this.accountId 
                    }, (err, data) => {
                        if (err) return reject(err);
                        resolve(data);
                    });
                });
                
                this.showDisconnectedState();
                if (alerts) {
                    require(['translator'], function(translator) {
                        translator.translate('[[caiz:disconnected-from-x-successfully]]', function(translated) {
                            alerts.success(translated);
                        });
                    });
                }
            } catch (err) {
                console.error('[X] Disconnection failed:', err);
                if (alerts) {
                    require(['translator'], function(translator) {
                        translator.translate('[[caiz:failed-to-disconnect-from-x]]', function(translated) {
                            alerts.error(translated);
                        });
                    });
                }
            }
        }
    }
    
    // Export for use in community-edit-notifications.js
    window.CommunityXManager = XManager;
    window.XManager = XManager;
})();
