class NotificationSettingsManager {
    constructor(cid) {
        this.cid = cid;
        this.init();
    }
    
    async init() {
        await this.loadNotificationSettings();
        this.setupEventListeners();
    }
    
    async loadNotificationSettings() {
        try {
            // Load both Slack and Discord settings
            const [slackSettings, discordSettings] = await Promise.all([
                new Promise((resolve, reject) => {
                    window.socket.emit('plugins.caiz.getSlackNotificationSettings', { cid: this.cid }, (err, data) => {
                        if (err) return reject(err);
                        resolve(data || {});
                    });
                }),
                new Promise((resolve, reject) => {
                    window.socket.emit('plugins.caiz.getDiscordNotificationSettings', { cid: this.cid }, (err, data) => {
                        if (err) return reject(err);
                        resolve(data || {});
                    });
                })
            ]);
            
            // Update platform enable checkboxes
            const slackEnabledCheckbox = document.getElementById('slack-enabled');
            const discordEnabledCheckbox = document.getElementById('discord-enabled');
            
            if (slackEnabledCheckbox) slackEnabledCheckbox.checked = slackSettings.enabled !== false;
            if (discordEnabledCheckbox) discordEnabledCheckbox.checked = discordSettings.enabled !== false;
            
            // Update notification type checkboxes (use Slack settings as primary)
            const newTopicCheckbox = document.getElementById('notify-new-topic');
            const newPostCheckbox = document.getElementById('notify-new-post');
            const memberJoinCheckbox = document.getElementById('notify-member-join');
            const memberLeaveCheckbox = document.getElementById('notify-member-leave');
            
            if (newTopicCheckbox) newTopicCheckbox.checked = slackSettings.newTopic !== false;
            if (newPostCheckbox) newPostCheckbox.checked = slackSettings.newPost !== false;
            if (memberJoinCheckbox) memberJoinCheckbox.checked = slackSettings.memberJoin === true;
            if (memberLeaveCheckbox) memberLeaveCheckbox.checked = slackSettings.memberLeave === true;
            
            console.log('[Notifications] Settings loaded:', { slack: slackSettings, discord: discordSettings });
        } catch (err) {
            console.error('Error loading notification settings:', err);
        }
    }
    
    async saveNotificationSettings() {
        try {
            // Show spinner
            const btn = document.getElementById('save-notification-settings');
            const spinner = btn.querySelector('.save-notification-btn-spinner');
            spinner.style.display = 'inline-block';
            btn.disabled = true;
            
            // Get platform enable checkboxes
            const slackEnabledCheckbox = document.getElementById('slack-enabled');
            const discordEnabledCheckbox = document.getElementById('discord-enabled');
            
            // Get notification type checkboxes
            const newTopicCheckbox = document.getElementById('notify-new-topic');
            const newPostCheckbox = document.getElementById('notify-new-post');
            const memberJoinCheckbox = document.getElementById('notify-member-join');
            const memberLeaveCheckbox = document.getElementById('notify-member-leave');
            
            const notificationSettings = {
                newTopic: newTopicCheckbox ? newTopicCheckbox.checked : true,
                newPost: newPostCheckbox ? newPostCheckbox.checked : true,
                memberJoin: memberJoinCheckbox ? memberJoinCheckbox.checked : false,
                memberLeave: memberLeaveCheckbox ? memberLeaveCheckbox.checked : false
            };
            
            const slackSettings = {
                enabled: slackEnabledCheckbox ? slackEnabledCheckbox.checked : true,
                ...notificationSettings
            };
            
            const discordSettings = {
                enabled: discordEnabledCheckbox ? discordEnabledCheckbox.checked : true,
                ...notificationSettings
            };
            
            // Save both Slack and Discord settings
            await Promise.all([
                new Promise((resolve, reject) => {
                    window.socket.emit('plugins.caiz.saveSlackNotificationSettings', { 
                        cid: this.cid, 
                        settings: slackSettings 
                    }, (err, data) => {
                        if (err) return reject(err);
                        resolve(data);
                    });
                }),
                new Promise((resolve, reject) => {
                    window.socket.emit('plugins.caiz.saveDiscordNotificationSettings', { 
                        cid: this.cid, 
                        settings: discordSettings 
                    }, (err, data) => {
                        if (err) return reject(err);
                        resolve(data);
                    });
                })
            ]);
            
            require(['alerts'], function(alerts) {
                alerts.success('[[caiz:notification-settings-saved]]');
            });
            
            console.log('[Notifications] Settings saved:', { slack: slackSettings, discord: discordSettings });
        } catch (err) {
            console.error('Error saving notification settings:', err);
            require(['alerts'], function(alerts) {
                alerts.error('[[caiz:failed-to-save-notification-settings]]');
            });
        } finally {
            // Hide spinner
            const btn = document.getElementById('save-notification-settings');
            const spinner = btn.querySelector('.save-notification-btn-spinner');
            spinner.style.display = 'none';
            btn.disabled = false;
        }
    }
    
    setupEventListeners() {
        const saveBtn = document.getElementById('save-notification-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveNotificationSettings();
            });
        }
    }
}

window.NotificationSettingsManager = NotificationSettingsManager;