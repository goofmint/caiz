'use strict';

define('admin/plugins/ai-moderation', ['settings', 'alerts', 'translator', 'autocomplete'], function(Settings, alerts, translator, autocomplete) {
    const ACP = {};

    ACP.init = function() {
        Settings.load('ai-moderation', $('.ai-moderation-settings'));

        $('#save').on('click', saveSettings);
        $('#test-connection').on('click', testConnection);
        
        // ユーザー検索機能の初期化
        initUserSearch();
        
        // 保存された設定から現在のユーザーを表示
        loadFlagUser();
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

    function initUserSearch() {
        // ユーザー検索のオートコンプリート設定
        autocomplete.user($('#flagUserSearch'), function(event, selected) {
            console.log('[ai-moderation] Autocomplete selected:', selected);
            
            // selectedオブジェクトの構造を確認
            if (selected) {
                // item プロパティがある場合
                if (selected.item) {
                    selectUser(selected.item.uid, selected.item.value || selected.item.username, selected.item.picture);
                }
                // 直接プロパティがある場合
                else if (selected.uid) {
                    selectUser(selected.uid, selected.value || selected.username, selected.picture);
                }
            }
        });
        
        // 検索ボタンのクリックイベント
        $('#flagUserSearchBtn').on('click', function() {
            const searchTerm = $('#flagUserSearch').val().trim();
            if (searchTerm) {
                searchUser(searchTerm);
            }
        });
        
        // Enterキーでも検索実行
        $('#flagUserSearch').on('keypress', function(e) {
            if (e.which === 13) {
                e.preventDefault();
                const searchTerm = $(this).val().trim();
                if (searchTerm) {
                    searchUser(searchTerm);
                }
            }
        });
    }
    
    function searchUser(username) {
        // NodeBBの標準的なユーザー検索API
        $.getJSON(config.relative_path + '/api/users?query=' + encodeURIComponent(username), function(data) {
            console.log('[ai-moderation] User search result:', data);
            
            if (data && data.users && data.users.length > 0) {
                const user = data.users[0];
                selectUser(user.uid, user.username, user.picture);
            } else {
                alerts.warning('[[ai-moderation:user-not-found]]');
            }
        }).fail(function() {
            alerts.error('[[ai-moderation:error-user-search]]');
        });
    }
    
    function selectUser(uid, username, picture) {
        // 値の検証
        if (!uid || !username) {
            console.warn('[ai-moderation] Invalid user data:', { uid, username });
            return;
        }
        
        console.log('[ai-moderation] Selecting user:', { uid, username, picture });
        
        $('#flagUid').val(uid);
        $('#flagUserSearch').val('');
        
        // 選択されたユーザーを表示
        const userHtml = `
            <span class="label label-primary" style="font-size: 14px; padding: 8px 12px;">
                ${picture ? `<img src="${picture}" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 5px; vertical-align: middle;">` : '<i class="fa fa-user" style="margin-right: 5px;"></i>'}
                <span>${username}</span>
                <span style="opacity: 0.8; margin-left: 5px;">(UID: ${uid})</span>
            </span>
        `;
        $('#selectedUser').html(userHtml);
    }
    
    function loadFlagUser() {
        // 設定から flagUid を読み込む
        window.socket.emit('plugins.ai-moderation.getSettings', {}, function(err, settings) {
            if (!err && settings && settings.flagUid) {
                // ユーザー情報を取得して表示
                window.socket.emit('user.getUserByUID', settings.flagUid, function(err, user) {
                    if (!err && user) {
                        selectUser(user.uid, user.username, user.picture);
                    }
                });
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