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
                // Remove # if it already exists in channelName
                const channelName = status.channelName.startsWith('#') ? status.channelName : '#' + status.channelName;
                document.getElementById('slack-channel-name').textContent = channelName;
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
        const self = this;
        
        require(['bootbox'], function(bootbox) {
            bootbox.confirm({
                title: '[[caiz:confirm-disconnect-slack]]',
                message: '[[caiz:confirm-disconnect-slack-message]]',
                buttons: {
                    cancel: {
                        label: '[[global:cancel]]',
                        className: 'btn-link'
                    },
                    confirm: {
                        label: '[[caiz:disconnect-slack]]',
                        className: 'btn-danger'
                    }
                },
                callback: async function(result) {
                    if (!result) {
                        return;
                    }
                    
                    try {
                        await new Promise((resolve, reject) => {
                            window.socket.emit('plugins.caiz.disconnectSlack', { cid: self.cid }, (err, data) => {
                                if (err) return reject(err);
                                resolve(data);
                            });
                        });
                        
                        self.showDisconnectedState();
                        
                        require(['alerts'], function(alerts) {
                            alerts.success('[[caiz:disconnected-from-slack-successfully]]');
                        });
                    } catch (err) {
                        console.error('Error disconnecting from Slack:', err);
                        require(['alerts'], function(alerts) {
                            alerts.error('[[caiz:failed-to-disconnect-from-slack]]');
                        });
                    }
                }
            });
        });
    }
    
    checkOAuthResult() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('slack_success')) {
            const teamName = urlParams.get('team');
            const channelName = urlParams.get('channel');
            
            require(['alerts'], function(alerts) {
                let message = '[[caiz:slack-connected-to-workspace, ' + teamName + ']]';
                if (channelName) {
                    message += ' (#' + channelName + ')';
                }
                alerts.success(message);
            });
            
            // Refresh connection status after a short delay
            setTimeout(() => {
                this.checkConnectionStatus();
            }, 1000);
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('slack_error')) {
            const error = urlParams.get('slack_error');
            let message = '[[caiz:slack-connection-failed-message]]';
            
            switch (error) {
                case 'access_denied':
                    message = '[[caiz:slack-connection-denied-message]]';
                    break;
                case 'invalid_request':
                    message = '[[caiz:slack-invalid-request]]';
                    break;
                case 'server_error':
                    message = '[[caiz:slack-server-error]]';
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
        
        // Setup notification settings handlers
        this.setupNotificationEventHandlers();
    }
    
    setupNotificationEventHandlers() {
        // Load notification settings when Slack is connected
        setTimeout(() => {
            this.loadNotificationSettings();
        }, 1000);
        
        // Save button handler for Slack settings
        const saveSlackBtn = document.getElementById('save-slack-notification-settings');
        if (saveSlackBtn) {
            saveSlackBtn.addEventListener('click', () => {
                this.saveNotificationSettings();
            });
        }
    }
    
    async loadNotificationSettings() {
        try {
            const settings = await new Promise((resolve, reject) => {
                window.socket.emit('plugins.caiz.getSlackNotificationSettings', { cid: this.cid }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            // Update checkboxes
            const newTopicCheckbox = document.getElementById('slack-notify-new-topic');
            const newPostCheckbox = document.getElementById('slack-notify-new-post');
            const memberJoinCheckbox = document.getElementById('slack-notify-member-join');
            const memberLeaveCheckbox = document.getElementById('slack-notify-member-leave');
            
            if (newTopicCheckbox) newTopicCheckbox.checked = settings.newTopic;
            if (newPostCheckbox) newPostCheckbox.checked = settings.newPost;
            if (memberJoinCheckbox) memberJoinCheckbox.checked = settings.memberJoin;
            if (memberLeaveCheckbox) memberLeaveCheckbox.checked = settings.memberLeave;
            
            console.log('[Slack] Notification settings loaded:', settings);
        } catch (err) {
            console.error('Error loading Slack notification settings:', err);
        }
    }
    
    async saveNotificationSettings() {
        try {
            // Get checkbox values
            const newTopicCheckbox = document.getElementById('slack-notify-new-topic');
            const newPostCheckbox = document.getElementById('slack-notify-new-post');
            const memberJoinCheckbox = document.getElementById('slack-notify-member-join');
            const memberLeaveCheckbox = document.getElementById('slack-notify-member-leave');
            
            const settings = {
                newTopic: newTopicCheckbox ? newTopicCheckbox.checked : true,
                newPost: newPostCheckbox ? newPostCheckbox.checked : true,
                memberJoin: memberJoinCheckbox ? memberJoinCheckbox.checked : false,
                memberLeave: memberLeaveCheckbox ? memberLeaveCheckbox.checked : false
            };
            
            await new Promise((resolve, reject) => {
                window.socket.emit('plugins.caiz.saveSlackNotificationSettings', { 
                    cid: this.cid, 
                    settings: settings 
                }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            require(['alerts'], function(alerts) {
                alerts.success('[[caiz:slack-notification-settings-saved]]');
            });
            
            console.log('[Slack] Notification settings saved:', settings);
        } catch (err) {
            console.error('Error saving Slack notification settings:', err);
            require(['alerts'], function(alerts) {
                alerts.error('[[caiz:failed-to-save-slack-notification-settings]]');
            });
        }
    }
    
}

window.SlackConnectionManager = SlackConnectionManager;