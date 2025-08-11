'use strict';

define('admin/plugins/ai-moderation', ['settings', 'alerts'], function(Settings, alerts) {
    const ACP = {};

    ACP.init = function() {
        Settings.load('ai-moderation', $('.ai-moderation-settings'));

        $('#save').on('click', saveSettings);
        $('#test-connection').on('click', testConnection);
    };

    function saveSettings() {
        Settings.save('ai-moderation', $('.ai-moderation-settings'), function() {
            alerts.success('設定を保存しました');
        });
    }

    function testConnection() {
        const apiKey = $('#apiKey').val();
        
        if (!apiKey) {
            alerts.error('APIキーを入力してください');
            return;
        }

        $('#test-connection').prop('disabled', true).text('テスト中...');

        app.socket.emit('plugins.ai-moderation.testConnection', { apiKey }, function(err, data) {
            $('#test-connection').prop('disabled', false).text('接続テスト');
            
            if (err) {
                return alerts.error('接続テストに失敗しました: ' + err.message);
            }

            if (data && data.success) {
                alerts.success('APIへの接続に成功しました');
            } else {
                alerts.error('APIへの接続に失敗しました: ' + (data?.error || 'Unknown error'));
            }
        });
    }

    return ACP;
});