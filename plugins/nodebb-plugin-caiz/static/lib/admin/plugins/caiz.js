define('admin/plugins/caiz-oauth', ['settings', 'alerts'], function (Settings, alerts) {
    const OAuthAdmin = {};
    
    OAuthAdmin.init = function () {
        // Load settings on page load
        loadSettings();
        
        // Set up event listeners
        $('#slack-oauth-form').on('submit', handleSlackSubmit);
        $('#discord-oauth-form').on('submit', handleDiscordSubmit);
        $('#test-slack').on('click', testSlackConnection);
        $('#test-discord').on('click', testDiscordConnection);
    };
    
    function loadSettings() {
        socket.emit('admin.plugins.caiz.getOAuthSettings', function(err, data) {
            if (err) {
                return alerts.error(err.message);
            }
            
            // Load Slack settings
            if (data.slack) {
                $('#slack-client-id').val(data.slack.clientId || '');
                // Don't load secrets - they should only be entered when changing
            }
            
            // Load Discord settings
            if (data.discord) {
                $('#discord-client-id').val(data.discord.clientId || '');
                // Don't load secrets - they should only be entered when changing
            }
        });
    }
    
    function handleSlackSubmit(e) {
        e.preventDefault();
        
        const settings = {
            clientId: $('#slack-client-id').val(),
            clientSecret: $('#slack-client-secret').val(),
            signingSecret: $('#slack-signing-secret').val()
        };
        
        // Only send secrets if they were entered
        if (!settings.clientSecret) {
            delete settings.clientSecret;
        }
        if (!settings.signingSecret) {
            delete settings.signingSecret;
        }
        
        socket.emit('admin.plugins.caiz.saveOAuthSettings', {
            platform: 'slack',
            settings: settings
        }, function(err) {
            if (err) {
                return alerts.error(err.message);
            }
            
            alerts.success('Slack settings saved successfully');
            // Clear password fields after save
            $('#slack-client-secret').val('');
            $('#slack-signing-secret').val('');
        });
    }
    
    function handleDiscordSubmit(e) {
        e.preventDefault();
        
        const settings = {
            clientId: $('#discord-client-id').val(),
            clientSecret: $('#discord-client-secret').val(),
            botToken: $('#discord-bot-token').val()
        };
        
        // Only send secrets if they were entered
        if (!settings.clientSecret) {
            delete settings.clientSecret;
        }
        if (!settings.botToken) {
            delete settings.botToken;
        }
        
        socket.emit('admin.plugins.caiz.saveOAuthSettings', {
            platform: 'discord',
            settings: settings
        }, function(err) {
            if (err) {
                return alerts.error(err.message);
            }
            
            alerts.success('Discord settings saved successfully');
            // Clear password fields after save
            $('#discord-client-secret').val('');
            $('#discord-bot-token').val('');
        });
    }
    
    function testSlackConnection() {
        socket.emit('admin.plugins.caiz.testOAuthConnection', {
            platform: 'slack'
        }, function(err, result) {
            if (err) {
                return alerts.error(err.message);
            }
            
            if (result.success) {
                alerts.success(result.message || 'Slack connection test successful');
            } else {
                alerts.error(result.message || 'Slack connection test failed');
            }
        });
    }
    
    function testDiscordConnection() {
        socket.emit('admin.plugins.caiz.testOAuthConnection', {
            platform: 'discord'
        }, function(err, result) {
            if (err) {
                return alerts.error(err.message);
            }
            
            if (result.success) {
                alerts.success(result.message || 'Discord connection test successful');
            } else {
                alerts.error(result.message || 'Discord connection test failed');
            }
        });
    }
    
    return OAuthAdmin;
});