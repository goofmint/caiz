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
                    const popup = window.open(authData.authUrl, 'x-auth', 'width=600,height=700');

                    // Listen for both postMessage and localStorage
                    const messageHandler = (event) => {
                        if (event && event.data && event.data.type === 'x-auth-success') {
                            handleSuccess(event.data);
                        }
                    };
                    
                    const handleSuccess = (data) => {
                        try { popup && popup.close && popup.close(); } catch (e) {}
                        window.removeEventListener('message', messageHandler);
                        clearInterval(pollInterval);
                        localStorage.removeItem('x-auth-callback');
                        this.showConnectedState({ accountId: data.accountId, screenName: data.screenName });
                        if (alerts) { alerts.success(`[[caiz:x-connected-to-account, ${data.screenName}]]`); }
                    };
                    
                    // Method 1: Listen for postMessage
                    window.addEventListener('message', messageHandler);
                    
                    // Method 2: Poll localStorage (for Cloudflare environments)
                    const pollInterval = setInterval(() => {
                        try {
                            const stored = localStorage.getItem('x-auth-callback');
                            if (stored) {
                                const data = JSON.parse(stored);
                                if (data.type === 'x-auth-success') {
                                    handleSuccess(data);
                                }
                            }
                        } catch(e) {}
                    }, 500);
                    
                    // Stop polling after 2 minutes
                    setTimeout(() => {
                        clearInterval(pollInterval);
                        window.removeEventListener('message', messageHandler);
                    }, 120000);
                }
            } catch (err) {
                console.error('[X] Connection failed:', err);
                this.showDisconnectedState();
                if (alerts) {
                    alerts.error('[[caiz:x-connection-failed-message]]');
                }
            }
        }
        
        async disconnectFromX() {
            const self = this;
            
            bootbox.confirm('[[caiz:confirm-disconnect-x-message]]', function(result) {
                if (result) {
                    self.performDisconnection();
                }
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
                    alerts.success('[[caiz:disconnected-from-x-successfully]]');
                }
            } catch (err) {
                console.error('[X] Disconnection failed:', err);
                if (alerts) {
                    alerts.error('[[caiz:failed-to-disconnect-from-x]]');
                }
            }
        }
    }
    
    // Export for use in community-edit-notifications.js
    window.CommunityXManager = XManager;
    window.XManager = XManager;
})();
