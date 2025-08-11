'use strict';

$(document).ready(function() {
    const AiModerationAdmin = {
        init: function() {
            this.bindEvents();
            this.loadSettings();
            this.refreshStats();
        },

        bindEvents: function() {
            $('#save').on('click', this.saveSettings);
            $('#test-connection').on('click', this.testConnection);
            $('#cleanup-logs').on('click', this.runCleanup);
            $('#refresh-stats').on('click', this.refreshStats);
            $('#api-key').on('input', this.updateApiKeyStatus);
        },

        loadSettings: function() {
            socket.emit('plugins.ai-moderation.getSettings', {}, function(err, data) {
                if (err) {
                    app.alertError('Failed to load settings: ' + err.message);
                    return;
                }

                if (data) {
                    $('#api-provider').val(data.provider || 'openai');
                    $('#threshold-flag').val(data.thresholdFlag || 70);
                    $('#threshold-reject').val(data.thresholdReject || 90);
                    $('#enable-content-hashing').prop('checked', data.enableContentHashing !== false);
                    $('#log-retention-days').val(data.logRetentionDays || 90);

                    if (data.hasApiKey) {
                        $('#api-key-status').html('<span class="label label-success">API Key configured</span>');
                    } else {
                        $('#api-key-status').html('<span class="label label-warning">No API Key configured</span>');
                    }
                }
            });
        },

        saveSettings: function() {
            const settings = {
                provider: $('#api-provider').val(),
                apiKey: $('#api-key').val(),
                thresholdFlag: parseInt($('#threshold-flag').val()),
                thresholdReject: parseInt($('#threshold-reject').val()),
                enableContentHashing: $('#enable-content-hashing').is(':checked'),
                logRetentionDays: parseInt($('#log-retention-days').val())
            };

            // バリデーション
            if (settings.thresholdFlag < 0 || settings.thresholdFlag > 100) {
                app.alertError('Flag threshold must be between 0 and 100');
                return;
            }

            if (settings.thresholdReject < 0 || settings.thresholdReject > 100) {
                app.alertError('Reject threshold must be between 0 and 100');
                return;
            }

            if (settings.thresholdFlag > settings.thresholdReject) {
                app.alertError('Flag threshold cannot be higher than reject threshold');
                return;
            }

            if (settings.logRetentionDays < 1 || settings.logRetentionDays > 365) {
                app.alertError('Log retention days must be between 1 and 365');
                return;
            }

            const saveBtn = $('#save');
            saveBtn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Saving...');

            socket.emit('plugins.ai-moderation.saveSettings', settings, function(err) {
                saveBtn.prop('disabled', false).html('<i class="fa fa-save"></i> Save Settings');

                if (err) {
                    app.alertError('Failed to save settings: ' + err.message);
                    return;
                }

                app.alertSuccess('Settings saved successfully');
                
                // APIキーが入力された場合はステータスを更新
                if (settings.apiKey) {
                    $('#api-key-status').html('<span class="label label-success">API Key configured</span>');
                    $('#api-key').val(''); // セキュリティのためクリア
                }

                AiModerationAdmin.refreshStats();
            });
        },

        testConnection: function() {
            const provider = $('#api-provider').val();
            const apiKey = $('#api-key').val();

            if (!apiKey) {
                app.alertError('Please enter an API key first');
                return;
            }

            const testBtn = $('#test-connection');
            testBtn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Testing...');

            socket.emit('plugins.ai-moderation.testConnection', {
                provider: provider,
                apiKey: apiKey
            }, function(err, result) {
                testBtn.prop('disabled', false).html('<i class="fa fa-plug"></i> Test API Connection');

                if (err) {
                    app.alertError('Test failed: ' + err.message);
                    $('#api-status').removeClass('label-success').addClass('label-danger').text('Failed');
                    return;
                }

                if (result.success) {
                    app.alertSuccess('API connection successful');
                    $('#api-status').removeClass('label-danger').addClass('label-success').text('Connected');
                } else {
                    app.alertError('API connection failed: ' + result.error);
                    $('#api-status').removeClass('label-success').addClass('label-danger').text('Failed');
                }
            });
        },

        runCleanup: function() {
            const cleanupBtn = $('#cleanup-logs');
            cleanupBtn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Running...');

            socket.emit('plugins.ai-moderation.runCleanup', {}, function(err, result) {
                cleanupBtn.prop('disabled', false).html('<i class="fa fa-trash"></i> Run Cleanup');

                if (err) {
                    app.alertError('Cleanup failed: ' + err.message);
                    return;
                }

                app.alertSuccess('Cleanup completed. ' + result.cleaned + ' entries cleaned.');
                $('#last-cleanup').text(new Date().toLocaleString());
                AiModerationAdmin.refreshStats();
            });
        },

        refreshStats: function() {
            socket.emit('plugins.ai-moderation.getStats', {}, function(err, stats) {
                if (err) {
                    console.error('Failed to load stats:', err);
                    return;
                }

                if (stats) {
                    $('#stat-total').text(stats.total || 0);
                    $('#stat-approved').text(stats.approved || 0);
                    $('#stat-flagged').text(stats.flagged || 0);
                    $('#stat-rejected').text(stats.rejected || 0);
                    $('#stat-avg-score').text(stats.avgScore || 0);
                }
            });

            // システムステータスも取得
            socket.emit('plugins.ai-moderation.getSystemStatus', {}, function(err, status) {
                if (err) {
                    console.error('Failed to load system status:', err);
                    return;
                }

                if (status) {
                    // Circuit Breaker状態
                    const circuitStatus = $('#circuit-status');
                    switch (status.circuitBreaker.state) {
                        case 'closed':
                            circuitStatus.removeClass('label-warning label-danger').addClass('label-success').text('Closed');
                            break;
                        case 'open':
                            circuitStatus.removeClass('label-success label-warning').addClass('label-danger').text('Open');
                            break;
                        case 'half-open':
                            circuitStatus.removeClass('label-success label-danger').addClass('label-warning').text('Half-Open');
                            break;
                        default:
                            circuitStatus.removeClass('label-success label-warning label-danger').addClass('label-default').text('Unknown');
                    }
                }
            });
        },

        updateApiKeyStatus: function() {
            const apiKey = $('#api-key').val();
            const status = $('#api-key-status');
            
            if (apiKey.length > 0) {
                status.html('<span class="label label-info">API Key entered (not saved yet)</span>');
            } else {
                // 元のステータスに戻す（ページ読み込み時の状態）
                AiModerationAdmin.loadSettings();
            }
        }
    };

    // 初期化
    AiModerationAdmin.init();

    // グローバルに公開（デバッグ用）
    window.AiModerationAdmin = AiModerationAdmin;
});