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
            $('#model').val(settings.api.model || 'gemini-pro');
            $('#max-tokens').val(settings.api.maxTokens || 2048);
            $('#temperature').val(settings.api.temperature || 0.3);
            $('#timeout').val(settings.api.timeout || 30);
        }
        
        // Prompt settings
        if (settings.prompts) {
            $('#system-prompt').val(settings.prompts.systemPrompt || '');
            $('#translation-instruction').val(settings.prompts.translationInstruction || '');
            $('#context-preservation').val(settings.prompts.contextPreservation || '');
            $('#output-format').val(settings.prompts.outputFormat || '');
        }
        
        // Language settings
        if (settings.languages) {
            // Set supported languages (multiple select)
            const supportedLangs = settings.languages.supportedLanguages || [];
            $('#supported-languages option').each(function() {
                $(this).prop('selected', supportedLangs.includes($(this).val()));
            });
            
            // Set default language
            $('#default-language').val(settings.languages.defaultLanguage || 'en');
            $('#auto-detection').prop('checked', settings.languages.autoDetection !== false);
        }
        
        console.log('[auto-translate] Settings populated');
    }
    
    function gatherFormData() {
        return {
            api: {
                geminiApiKey: $('#gemini-api-key').val(),
                model: $('#model').val(),
                maxTokens: parseInt($('#max-tokens').val(), 10),
                temperature: parseFloat($('#temperature').val()),
                timeout: parseInt($('#timeout').val(), 10)
            },
            prompts: {
                systemPrompt: $('#system-prompt').val(),
                translationInstruction: $('#translation-instruction').val(),
                contextPreservation: $('#context-preservation').val(),
                outputFormat: $('#output-format').val()
            },
            languages: {
                supportedLanguages: $('#supported-languages').val() || [],
                defaultLanguage: $('#default-language').val(),
                autoDetection: $('#auto-detection').is(':checked')
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
        $('#model').val('gemini-pro');
        $('#max-tokens').val(2048);
        $('#temperature').val(0.3);
        $('#timeout').val(30);
        
        $('#system-prompt').val('You are a professional translator. Translate the following content accurately while preserving the original meaning and context.');
        $('#translation-instruction').val('Translate to {{targetLang}} from {{sourceLang}}. Maintain formatting, code blocks, and markdown syntax.');
        $('#context-preservation').val('Preserve technical terms, product names, and proper nouns appropriately.');
        $('#output-format').val('Return only the translated text without any explanations or notes.');
        
        $('#supported-languages option').prop('selected', false);
        $('#supported-languages option[value="en"], #supported-languages option[value="ja"], #supported-languages option[value="zh-CN"], #supported-languages option[value="es"], #supported-languages option[value="fr"], #supported-languages option[value="de"], #supported-languages option[value="ko"]').prop('selected', true);
        $('#default-language').val('en');
        $('#auto-detection').prop('checked', true);
        
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