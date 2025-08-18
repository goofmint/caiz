// Handle Slack OAuth results on any page
$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('slack_success') || urlParams.get('slack_error')) {
        // Handle OAuth result notifications
        if (urlParams.get('slack_success')) {
            const teamName = urlParams.get('team');
            const channelName = urlParams.get('channel');
            
            require(['alerts', 'translator'], function(alerts, translator) {
                let message = `Connected to Slack workspace ${teamName}`;
                if (channelName) {
                    // Remove # if it already exists
                    const cleanChannelName = channelName.startsWith('#') ? channelName : '#' + channelName;
                    message += ` (${cleanChannelName})`;
                }
                
                // Try to translate
                translator.translate('[[caiz:slack-connected-to-workspace, ' + teamName + ']]', function(translated) {
                    if (channelName) {
                        const cleanChannelName = channelName.startsWith('#') ? channelName : '#' + channelName;
                        translated += ` (${cleanChannelName})`;
                    }
                    alerts.success(translated);
                });
            });
        } else if (urlParams.get('slack_error')) {
            const error = urlParams.get('slack_error');
            let messageKey = 'caiz:slack-connection-failed-message';
            
            switch (error) {
                case 'access_denied':
                    messageKey = 'caiz:slack-connection-denied-message';
                    break;
                case 'invalid_request':
                    messageKey = 'caiz:slack-invalid-request';
                    break;
                case 'server_error':
                    messageKey = 'caiz:slack-server-error';
                    break;
            }
            
            require(['alerts', 'translator'], function(alerts, translator) {
                translator.translate('[[' + messageKey + ']]', function(translated) {
                    alerts.error(translated);
                });
            });
        }
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});