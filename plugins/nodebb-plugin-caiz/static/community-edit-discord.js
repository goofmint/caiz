class DiscordConnectionManager {
    constructor(cid) {
        this.cid = cid;
        this.init();
    }
    
    async init() {
        await this.checkConnectionStatus();
        this.setupEventListeners();
        this.checkOAuthResult();
    }
    
    async checkConnectionStatus() {
        try {
            const status = await new Promise((resolve, reject) => {
                window.socket.emit('plugins.caiz.getDiscordStatus', { cid: this.cid }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            this.updateUI(status);
        } catch (err) {
            console.error('Error checking Discord connection status:', err);
            this.showDisconnectedState();
        }
    }
    
    updateUI(status) {
        const disconnectedEl = document.getElementById('discord-disconnected');
        const connectedEl = document.getElementById('discord-connected');
        const connectingEl = document.getElementById('discord-connecting');
        
        if (status && (status.guildId || status.guildName)) {
            disconnectedEl.style.display = 'none';
            connectedEl.style.display = 'block';
            connectingEl.style.display = 'none';
            
            document.getElementById('discord-guild-name').textContent = status.guildName || '';
            
            if (status.username) {
                document.getElementById('discord-user-info').style.display = 'inline';
                document.getElementById('discord-username').textContent = status.username;
            }
            
            if (status.connectedAt) {
                const date = new Date(status.connectedAt);
                document.getElementById('discord-connected-date').textContent = date.toLocaleDateString();
            }
        } else {
            disconnectedEl.style.display = 'block';
            connectedEl.style.display = 'none';
            connectingEl.style.display = 'none';
        }
    }
    
    showDisconnectedState() {
        document.getElementById('discord-disconnected').style.display = 'block';
        document.getElementById('discord-connected').style.display = 'none';
        document.getElementById('discord-connecting').style.display = 'none';
    }
    
    showConnectingState() {
        document.getElementById('discord-disconnected').style.display = 'none';
        document.getElementById('discord-connected').style.display = 'none';
        document.getElementById('discord-connecting').style.display = 'block';
    }
    
    async connectToDiscord() {
        try {
            console.log('[Discord] Starting connection process for community:', this.cid);
            this.showConnectingState();
            
            const authData = await new Promise((resolve, reject) => {
                console.log('[Discord] Emitting getDiscordAuthUrl...');
                window.socket.emit('plugins.caiz.getDiscordAuthUrl', { cid: this.cid }, (err, data) => {
                    console.log('[Discord] getDiscordAuthUrl response:', { err, data });
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            console.log('[Discord] Redirecting to:', authData.authUrl);
            window.location.href = authData.authUrl;
        } catch (err) {
            console.error('Error connecting to Discord:', err);
            this.showDisconnectedState();
            require(['alerts'], function(alerts) {
                alerts.error('Failed to connect to Discord: ' + err.message);
            });
        }
    }
    
    async disconnectFromDiscord() {
        const self = this;
        
        require(['bootbox'], function(bootbox) {
            bootbox.confirm({
                title: '[[caiz:confirm-disconnect-discord]]',
                message: '[[caiz:confirm-disconnect-discord-message]]',
                buttons: {
                    cancel: {
                        label: '[[global:cancel]]',
                        className: 'btn-link'
                    },
                    confirm: {
                        label: '[[caiz:disconnect-discord]]',
                        className: 'btn-danger'
                    }
                },
                callback: async function(result) {
                    if (!result) {
                        return;
                    }
                    
                    try {
                        await new Promise((resolve, reject) => {
                            window.socket.emit('plugins.caiz.disconnectDiscord', { cid: self.cid }, (err, data) => {
                                if (err) return reject(err);
                                resolve(data);
                            });
                        });
                        
                        self.showDisconnectedState();
                        
                        require(['alerts'], function(alerts) {
                            alerts.success('[[caiz:disconnected-from-discord-successfully]]');
                        });
                    } catch (err) {
                        console.error('Error disconnecting from Discord:', err);
                        require(['alerts'], function(alerts) {
                            alerts.error('[[caiz:failed-to-disconnect-from-discord]]');
                        });
                    }
                }
            });
        });
    }
    
    checkOAuthResult() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('discord_success')) {
            const guildName = urlParams.get('guild');
            
            require(['alerts'], function(alerts) {
                let message = '[[caiz:discord-connected-to-server, ' + (guildName || '') + ']]';
                alerts.success(message);
            });
            
            // Refresh connection status after a short delay
            setTimeout(() => {
                this.checkConnectionStatus();
            }, 1000);
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('discord_error')) {
            const error = urlParams.get('discord_error');
            let message = '[[caiz:discord-connection-failed-message]]';
            
            switch (error) {
                case 'access_denied':
                    message = '[[caiz:discord-connection-denied-message]]';
                    break;
                case 'invalid_request':
                    message = '[[caiz:discord-invalid-request]]';
                    break;
                case 'server_error':
                    message = '[[caiz:discord-server-error]]';
                    break;
            }
            
            require(['alerts'], function(alerts) {
                alerts.error(message);
            });
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    setupEventListeners() {
        console.log('[Discord] Setting up event listeners for community:', this.cid);
        
        // Wait for DOM to be ready
        setTimeout(() => {
            const connectBtn = document.getElementById('connect-discord');
            if (connectBtn) {
                console.log('[Discord] Connect button found, adding listener');
                connectBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('[Discord] Connect button clicked');
                    this.connectToDiscord();
                });
            } else {
                console.log('[Discord] Connect button not found');
            }
            
            const disconnectBtn = document.getElementById('disconnect-discord');
            if (disconnectBtn) {
                console.log('[Discord] Disconnect button found, adding listener');
                disconnectBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.disconnectFromDiscord();
                });
            }
        }, 100);
    }
}

window.DiscordConnectionManager = DiscordConnectionManager;