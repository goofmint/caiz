'use strict';

define('admin/plugins/ai-moderation', ['settings', 'alerts'], function(Settings, alerts) {
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
        $button.text('[[ai-moderation:testing-connection]]');

        app.socket.emit('plugins.ai-moderation.testConnection', { apiKey }, function(err, data) {
            // ボタン状態を復元
            $button.prop('disabled', false).text(originalText);
            
            if (err) {
                // 具体的なエラーメッセージの判定
                let errorMessage = '[[ai-moderation:error-connection-failed]]';
                const errorStr = err.message || err.toString();
                
                if (errorStr.includes('401') || errorStr.includes('invalid') || errorStr.includes('Unauthorized')) {
                    errorMessage = '[[ai-moderation:error-invalid-api-key]]';
                } else if (errorStr.includes('timeout') || errorStr.includes('ECONNREFUSED')) {
                    errorMessage = '[[ai-moderation:error-connection-timeout]]';
                } else if (errorStr.includes('429') || errorStr.includes('rate limit')) {
                    errorMessage = '[[ai-moderation:error-rate-limit]]';
                }
                
                alerts.error(errorMessage + ': ' + errorStr);
                return;
            }

            if (data && data.success) {
                alerts.success('[[ai-moderation:success-connection-test]]');
            } else {
                const errorMsg = data?.error || 'Unknown error';
                alerts.error('[[ai-moderation:error-connection-failed]]: ' + errorMsg);
            }
        });
    }

    return ACP;
});