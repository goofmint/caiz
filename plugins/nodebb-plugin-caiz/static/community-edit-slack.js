class SlackConnectionManager {
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
                window.window.socket.emit('plugins.caiz.getSlackConnectionStatus', { cid: this.cid }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            this.updateUI(status);
            
            if (status.connected) {
                await this.loadChannels();
            }
        } catch (err) {
            console.error('Error checking Slack connection status:', err);
            this.showDisconnectedState();
        }
    }
    
    updateUI(status) {
        const disconnectedEl = document.getElementById('slack-disconnected');
        const connectedEl = document.getElementById('slack-connected');
        const connectingEl = document.getElementById('slack-connecting');
        
        if (status.connected) {
            disconnectedEl.style.display = 'none';
            connectedEl.style.display = 'block';
            connectingEl.style.display = 'none';
            
            document.getElementById('slack-team-name').textContent = status.teamName || '';
            
            if (status.connectedAt) {
                const date = new Date(status.connectedAt);
                document.getElementById('slack-connected-date').textContent = date.toLocaleDateString();
            }
        } else {
            disconnectedEl.style.display = 'block';
            connectedEl.style.display = 'none';
            connectingEl.style.display = 'none';
        }
    }
    
    showDisconnectedState() {
        document.getElementById('slack-disconnected').style.display = 'block';
        document.getElementById('slack-connected').style.display = 'none';
        document.getElementById('slack-connecting').style.display = 'none';
    }
    
    showConnectingState() {
        document.getElementById('slack-disconnected').style.display = 'none';
        document.getElementById('slack-connected').style.display = 'none';
        document.getElementById('slack-connecting').style.display = 'block';
    }
    
    async connectToSlack() {
        try {
            this.showConnectingState();
            
            const authData = await new Promise((resolve, reject) => {
                window.socket.emit('plugins.caiz.getSlackAuthUrl', { cid: this.cid }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            window.location.href = authData.authUrl;
        } catch (err) {
            console.error('Error connecting to Slack:', err);
            this.showDisconnectedState();
            require(['alerts'], function(alerts) {
                alerts.error('Failed to connect to Slack: ' + err.message);
            });
        }
    }
    
    async disconnectFromSlack() {
        if (!confirm('Are you sure you want to disconnect from Slack?')) {
            return;
        }
        
        try {
            await new Promise((resolve, reject) => {
                window.socket.emit('plugins.caiz.disconnectSlack', { cid: this.cid }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            this.showDisconnectedState();
            
            require(['alerts'], function(alerts) {
                alerts.success('Disconnected from Slack successfully');
            });
        } catch (err) {
            console.error('Error disconnecting from Slack:', err);
            require(['alerts'], function(alerts) {
                alerts.error('Failed to disconnect from Slack: ' + err.message);
            });
        }
    }
    
    async loadChannels() {
        try {
            const response = await new Promise((resolve, reject) => {
                window.socket.emit('plugins.caiz.getSlackChannels', { cid: this.cid }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            const select = document.getElementById('slack-channel');
            select.innerHTML = '<option value="">[[caiz:select-channel]]</option>';
            
            response.channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = '#' + channel.name;
                select.appendChild(option);
            });
        } catch (err) {
            console.error('Error loading Slack channels:', err);
            const select = document.getElementById('slack-channel');
            select.innerHTML = '<option value="">[[caiz:error-loading-channels]]</option>';
        }
    }
    
    async setNotificationChannel(channelId) {
        try {
            const select = document.getElementById('slack-channel');
            const channelName = select.options[select.selectedIndex].textContent.replace('#', '');
            
            await new Promise((resolve, reject) => {
                window.socket.emit('plugins.caiz.setSlackChannel', { 
                    cid: this.cid, 
                    channelId: channelId,
                    channelName: channelName
                }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            require(['alerts'], function(alerts) {
                alerts.success('Slack notification channel updated');
            });
        } catch (err) {
            console.error('Error setting Slack channel:', err);
            require(['alerts'], function(alerts) {
                alerts.error('Failed to set notification channel: ' + err.message);
            });
        }
    }
    
    setupEventListeners() {
        console.log('[Slack] Setting up event listeners for community:', this.cid);
        
        const connectBtn = document.getElementById('connect-slack');
        if (connectBtn) {
            console.log('[Slack] Connect button found, adding listener');
            connectBtn.addEventListener('click', () => {
                console.log('[Slack] Connect button clicked');
                this.connectToSlack();
            });
        } else {
            console.log('[Slack] Connect button not found');
        }
        
        const disconnectBtn = document.getElementById('disconnect-slack');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnectFromSlack();
            });
        }
        
        const channelSelect = document.getElementById('slack-channel');
        if (channelSelect) {
            channelSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.setNotificationChannel(e.target.value);
                }
            });
        }
    }
    
    checkOAuthResult() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('slack_success')) {
            const teamName = urlParams.get('team');
            require(['alerts'], function(alerts) {
                alerts.success('Successfully connected to Slack' + (teamName ? ` workspace: ${teamName}` : ''));
            });
            
            setTimeout(() => {
                this.checkConnectionStatus();
            }, 1000);
            
            // URL パラメータをクリア
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('slack_error')) {
            const error = urlParams.get('slack_error');
            let message = 'Failed to connect to Slack';
            
            switch (error) {
                case 'access_denied':
                    message = 'Slack connection was denied';
                    break;
                case 'invalid_request':
                    message = 'Invalid Slack OAuth request';
                    break;
                case 'auth_failed':
                    message = 'Slack authentication failed';
                    break;
                case 'server_error':
                    message = 'Server error during Slack connection';
                    break;
            }
            
            require(['alerts'], function(alerts) {
                alerts.error(message);
            });
            
            // URL パラメータをクリア
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

window.SlackConnectionManager = SlackConnectionManager;