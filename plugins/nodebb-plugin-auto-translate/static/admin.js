'use strict';

define('admin/plugins/auto-translate', ['settings', 'alerts'], function (Settings, alerts) {
    const ACP = {};
    let currentSettings = {};
    let connectionTested = false;
    
    ACP.init = function () {
        // Load current settings
        loadSettings();
        
        // Bind event handlers
        $('#save-settings').on('click', saveSettings);
        $('#test-connection').on('click', testApiConnection);
        
        // Initial save button state
        updateSaveButtonState(false);
        
        console.log('[auto-translate] Admin panel initialized');
    };
    
    function loadSettings() {
        window.socket.emit('plugins.autoTranslate.getSettings', {}, function(err, settings) {
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
        // API settings - don't populate API key, leave it empty for security
        // User can enter new API key if needed
        
        // Prompt settings
        if (settings.prompts) {
            $('#system-prompt').val(settings.prompts.systemPrompt || '');
        }
        
        // If API key is already saved, enable save button (already tested)
        if (settings.api && settings.api.geminiApiKey) {
            updateSaveButtonState(true);
        }
        
        console.log('[auto-translate] Settings populated');
    }
    
    function gatherFormData() {
        const data = {
            prompts: {
                systemPrompt: $('#system-prompt').val()
            }
        };
        
        // Only include API key if it's been entered
        const apiKey = $('#gemini-api-key').val();
        if (apiKey && apiKey.trim()) {
            data.api = {
                geminiApiKey: apiKey.trim()
            };
        }
        
        return data;
    }
    
    function saveSettings() {
        if (!connectionTested) {
            alerts.error('Please test the API connection first');
            return;
        }
        
        const $saveBtn = $('#save-settings');
        const originalText = $saveBtn.html();
        
        $saveBtn.prop('disabled', true).html('<i class="fa fa-spin fa-spinner"></i> Saving...');
        
        const settings = gatherFormData();
        
        window.socket.emit('plugins.autoTranslate.saveSettings', settings, function(err, result) {
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
    
    function testApiConnection() {
        const apiKey = $('#gemini-api-key').val();
        
        // If no API key entered, test with saved one
        if (!apiKey || !apiKey.trim()) {
            if (!currentSettings.api || !currentSettings.api.geminiApiKey) {
                alerts.error('Please enter a Gemini API key first');
                return;
            }
        }
        
        const $testBtn = $('#test-connection');
        const originalText = $testBtn.html();
        
        $testBtn.prop('disabled', true).html('<i class="fa fa-spin fa-spinner"></i> Testing...');
        
        // Use entered API key or request test with saved key
        const testData = apiKey && apiKey.trim() ? { apiKey: apiKey } : { useSavedKey: true };
        
        window.socket.emit('plugins.autoTranslate.testConnection', testData, function(err, result) {
            $testBtn.prop('disabled', false).html(originalText);
            
            if (err) {
                console.error('[auto-translate] Connection test failed:', err);
                alerts.error(err.message || 'Connection failed');
                updateSaveButtonState(false);
                return;
            }
            
            if (result.success) {
                alerts.success('Connection successful! Gemini API is working.');
                updateSaveButtonState(true);
            } else {
                alerts.error('API connection failed: ' + (result.message || 'Unknown error'));
                updateSaveButtonState(false);
            }
        });
    }
    
    function updateSaveButtonState(enabled) {
        connectionTested = enabled;
        const $saveBtn = $('#save-settings');
        
        if (enabled) {
            $saveBtn.prop('disabled', false).removeClass('btn-secondary').addClass('btn-primary');
        } else {
            $saveBtn.prop('disabled', true).removeClass('btn-primary').addClass('btn-secondary');
        }
    }
    
    return ACP;
});