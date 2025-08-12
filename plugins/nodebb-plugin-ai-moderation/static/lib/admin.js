'use strict';

define('admin/plugins/ai-moderation', ['settings', 'alerts', 'translator'], function(Settings, alerts, translator) {
    const ACP = {};

    ACP.init = function() {
        Settings.load('ai-moderation', $('.ai-moderation-settings'));

        $('#save').on('click', saveSettings);
        $('#test-connection').on('click', testConnection);
    };

    function saveSettings() {
        Settings.save('ai-moderation', $('.ai-moderation-settings'), function(err) {
            if (err) {
                alerts.error('[[ai-moderation:settings-save-error]]: ' + err.message);
            } else {
                alerts.success('[[ai-moderation:settings-saved]]');
            }
        });
    }

    function testConnection() {
        const apiKey = $('#apiKey').val().trim();
        const $button = $('#test-connection');
        
        if (!apiKey) {
            alerts.error('[[ai-moderation:error-api-key-required]]');
            return;
        }

        // ボタン状態を更新
        $button.prop('disabled', true);
        const originalText = $button.text();
        
        translator.translate('[[ai-moderation:testing-connection]]', function(translated) {
            $button.text(translated);
        });

        window.socket.emit('plugins.ai-moderation.testConnection', { apiKey }, function(err, data) {
            // ボタン状態を復元
            $button.prop('disabled', false).text(originalText);
            
            if (err) {
                // Log the full error for debugging
                console.error('[ai-moderation] Connection test error:', err);
                
                // Normalize error checking
                const errorMessage = err.message || err.toString() || '';
                const errorLower = errorMessage.toLowerCase();
                const errorCode = err.code || '';
                const statusCode = err.status || err.statusCode || 0;
                
                let localizedError = '[[ai-moderation:error-connection-failed]]';
                
                // Check for specific error conditions
                if (statusCode === 401 || 
                    errorLower.includes('401') || 
                    errorLower.includes('unauthorized') || 
                    errorLower.includes('invalid') ||
                    errorLower.includes('api key')) {
                    localizedError = '[[ai-moderation:error-invalid-api-key]]';
                } else if (statusCode === 429 || 
                           errorLower.includes('429') || 
                           errorLower.includes('rate limit') ||
                           errorLower.includes('too many')) {
                    localizedError = '[[ai-moderation:error-rate-limit]]';
                } else if (errorCode === 'ETIMEDOUT' || 
                           errorCode === 'ECONNRESET' ||
                           errorCode === 'ECONNREFUSED' ||
                           errorCode === 'ENOTFOUND' ||
                           errorLower.includes('timeout') ||
                           errorLower.includes('timed out') ||
                           errorLower.includes('connection')) {
                    localizedError = '[[ai-moderation:error-connection-timeout]]';
                }
                
                // Only show localized error to user (no raw error details)
                alerts.error(localizedError);
                return;
            }

            if (data && data.success) {
                alerts.success('[[ai-moderation:success-connection-test]]');
            } else {
                // Log error for debugging but don't expose to user
                console.error('[ai-moderation] Connection test failed:', data?.error || 'Unknown error');
                alerts.error('[[ai-moderation:error-connection-failed]]');
            }
        });
    }

    return ACP;
});