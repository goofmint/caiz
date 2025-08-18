class SlackConnectionManager {
    constructor(cid) {
        this.cid = cid;
        this.init();
    }
    
    async init() {
        await this.checkConnectionStatus();
        this.setupEventListeners();
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
            
            if (status.channelName) {
                document.getElementById('slack-channel-info').style.display = 'inline';
                document.getElementById('slack-channel-name').textContent = '#' + status.channelName;
            }
            
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
        
    }
    
}

window.SlackConnectionManager = SlackConnectionManager;