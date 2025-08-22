'use strict';

define('admin/plugins/auto-translate', ['settings', 'alerts'], function (Settings, alerts) {
    const ACP = {};
    let currentSettings = {};
    
    ACP.init = function () {
        Settings.load('auto-translate', $('.auto-translate-settings'));
        
        // Load current settings
        loadSettings();
        
        // Bind event handlers
        $('#save-settings').on('click', saveSettings);
        $('#reset-settings').on('click', resetSettings);
        $('#test-connection').on('click', testApiConnection);
        $('#preview-prompt').on('click', previewPrompt);
        
        console.log('[auto-translate] Admin panel initialized');
    };
    
    function loadSettings() {
        window.socket.emit('plugins.auto-translate.getSettings', {}, function(err, settings) {
            if (err) {
                console.error('[auto-translate] Failed to load settings:', err);
                alerts.error('Failed to load settings: ' + err.message);
                return;
            }
            
            currentSettings = settings;
            populateForm(settings);
        });
    }
    
    function populateForm(settings) {
        // API settings
        if (settings.api) {
            $('#gemini-api-key').val(settings.api.geminiApiKey || '');
        }
        
        // Prompt settings
        if (settings.prompts) {
            $('#system-prompt').val(settings.prompts.systemPrompt || '');
        }
        
        console.log('[auto-translate] Settings populated');
    }
    
    function gatherFormData() {
        return {
            api: {
                geminiApiKey: $('#gemini-api-key').val()
            },
            prompts: {
                systemPrompt: $('#system-prompt').val()
            }
        };
    }
    
    function saveSettings() {
        const $saveBtn = $('#save-settings');
        const originalText = $saveBtn.html();
        
        $saveBtn.prop('disabled', true).html('<i class="fa fa-spin fa-spinner"></i> Saving...');
        
        const settings = gatherFormData();
        
        window.socket.emit('plugins.auto-translate.saveSettings', settings, function(err, result) {
            $saveBtn.prop('disabled', false).html(originalText);
            
            if (err) {
                console.error('[auto-translate] Failed to save settings:', err);
                alerts.error('Failed to save settings: ' + err.message);
                return;
            }
            
            if (result.success) {
                currentSettings = settings;
                alerts.success('Settings saved successfully');
                console.log('[auto-translate] Settings saved successfully');
            } else {
                alerts.error('Failed to save settings');
            }
        });
    }
    
    function resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to default values?')) {
            return;
        }
        
        // Reset to default values
        $('#gemini-api-key').val('');
        $('#system-prompt').val('You are a professional translator. Translate the following content accurately while preserving the original meaning and context.');
        
        alerts.success('Settings reset to default values');
    }
    
    function testApiConnection() {
        const apiKey = $('#gemini-api-key').val();
        
        if (!apiKey) {
            alerts.error('Please enter an API key first');
            return;
        }
        
        const $testBtn = $('#test-connection');
        const originalText = $testBtn.html();
        
        $testBtn.prop('disabled', true).html('<i class="fa fa-spin fa-spinner"></i> Testing...');
        
        window.socket.emit('plugins.auto-translate.testConnection', { apiKey: apiKey }, function(err, result) {
            $testBtn.prop('disabled', false).html(originalText);
            
            if (err) {
                console.error('[auto-translate] Connection test failed:', err);
                alerts.error('Connection test failed: ' + err.message);
                return;
            }
            
            if (result.success) {
                alerts.success('API connection successful! Model: ' + result.model);
            } else {
                alerts.error('API connection failed: ' + result.message);
            }
        });
    }
    
    function previewPrompt() {
        const settings = gatherFormData();
        
        window.socket.emit('plugins.auto-translate.previewPrompt', {
            content: 'Hello, this is a sample content for translation preview.',
            targetLang: 'ja',
            sourceLang: 'en'
        }, function(err, result) {
            if (err) {
                console.error('[auto-translate] Prompt preview failed:', err);
                alerts.error('Prompt preview failed: ' + err.message);
                return;
            }
            
            $('#prompt-preview-content').text(result.prompt);
            $('#prompt-preview-modal').modal('show');
        });
    }
    
    return ACP;
});