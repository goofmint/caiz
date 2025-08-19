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
            const settings = await new Promise((resolve, reject) => {
                window.socket.emit('plugins.caiz.getSlackNotificationSettings', { cid: this.cid }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            
            // Update checkboxes
            const newTopicCheckbox = document.getElementById('notify-new-topic');
            const newPostCheckbox = document.getElementById('notify-new-post');
            const memberJoinCheckbox = document.getElementById('notify-member-join');
            const memberLeaveCheckbox = document.getElementById('notify-member-leave');
            
            if (newTopicCheckbox) newTopicCheckbox.checked = settings.newTopic;
            if (newPostCheckbox) newPostCheckbox.checked = settings.newPost;
            if (memberJoinCheckbox) memberJoinCheckbox.checked = settings.memberJoin;
            if (memberLeaveCheckbox) memberLeaveCheckbox.checked = settings.memberLeave;
            
            console.log('[Notifications] Settings loaded:', settings);
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
            
            // Get checkbox values
            const newTopicCheckbox = document.getElementById('notify-new-topic');
            const newPostCheckbox = document.getElementById('notify-new-post');
            const memberJoinCheckbox = document.getElementById('notify-member-join');
            const memberLeaveCheckbox = document.getElementById('notify-member-leave');
            
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
                alerts.success('[[caiz:notification-settings-saved]]');
            });
            
            console.log('[Notifications] Settings saved:', settings);
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