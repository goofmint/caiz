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

        // window.socketを直接使用
        console.log('[ai-moderation] Emitting testConnection event', { 
            hasApiKey: !!apiKey, 
            apiKeyLength: apiKey ? apiKey.length : 0,
            apiKeyStart: apiKey ? apiKey.substring(0, 7) + '...' : 'none'
        });
        window.socket.emit('plugins.ai-moderation.testConnection', { apiKey }, function(err, data) {
            console.log('[ai-moderation] Received response:', err, data);
            // ボタン状態を復元
            $button.prop('disabled', false).text(originalText);
            
            if (err) {
                console.error('[ai-moderation] Connection test error:', err);
                
                // エラーメッセージから適切なローカライズキーを選択
                const errorStr = err.message || err.toString() || '';
                let localizedError = '[[ai-moderation:error-connection-failed]]';
                
                if (errorStr.includes('429') || errorStr.includes('Too Many Requests') || errorStr.includes('rate limit')) {
                    localizedError = '[[ai-moderation:error-rate-limit]]';
                } else if (errorStr.includes('401') || errorStr.includes('Unauthorized') || errorStr.includes('invalid')) {
                    localizedError = '[[ai-moderation:error-invalid-api-key]]';
                } else if (errorStr.includes('timeout') || errorStr.includes('ETIMEDOUT')) {
                    localizedError = '[[ai-moderation:error-connection-timeout]]';
                }
                
                alerts.error(localizedError);
                return;
            }

            if (data && data.success) {
                alerts.success('[[ai-moderation:success-connection-test]]');
            } else {
                console.error('[ai-moderation] Connection test failed:', data?.error || 'Unknown error');
                
                // データのエラーメッセージも分析
                const dataError = data?.error || '';
                let localizedError = '[[ai-moderation:error-connection-failed]]';
                
                if (dataError.includes('429') || dataError.includes('Too Many Requests') || dataError.includes('rate limit')) {
                    // 429エラーは接続成功を意味するので、警告として表示
                    alerts.alert({
                        alert_id: 'ai-moderation-rate-limit',
                        type: 'warning', 
                        message: '[[ai-moderation:warning-rate-limit-but-connected]]',
                        timeout: 5000
                    });
                    return;
                } else if (dataError.includes('401') || dataError.includes('Unauthorized') || dataError.includes('invalid')) {
                    localizedError = '[[ai-moderation:error-invalid-api-key]]';
                } else if (dataError.includes('timeout')) {
                    localizedError = '[[ai-moderation:error-connection-timeout]]';
                }
                
                alerts.error(localizedError);
            }
        });
    }

    return ACP;
});