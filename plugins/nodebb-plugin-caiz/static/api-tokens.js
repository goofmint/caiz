'use strict';

$(document).ready(function() {
    const APITokens = {};

    // Load API tokens from server
    APITokens.loadTokens = function() {
        window.socket.emit('modules.apiTokens.get', {}, function(err, tokens) {
            if (err) {
                app.alertError(err.message);
                return;
            }
            APITokens.displayTokens(tokens);
        });
    };

    // Display tokens in a modal or view
    APITokens.displayTokens = function(tokens) {
        // Implementation will be added in task 39
        console.log('API Tokens:', tokens);
        
        // Show modal with token list
        const modal = bootbox.dialog({
            title: '[[caiz:api-tokens-management]]',
            message: '<div class="text-center"><i class="fa fa-spinner fa-spin"></i> [[caiz:loading-tokens]]</div>',
            size: 'large',
            buttons: {
                create: {
                    label: '[[caiz:create-api-token]]',
                    className: 'btn-primary',
                    callback: function() {
                        APITokens.showCreateDialog();
                        return false;
                    }
                },
                close: {
                    label: '[[global:close]]',
                    className: 'btn-secondary'
                }
            }
        });

        // Update modal content with tokens
        if (!tokens || tokens.length === 0) {
            modal.find('.bootbox-body').html('<div class="alert alert-info">[[caiz:no-api-tokens]]</div>');
        } else {
            let tokenList = '<div class="list-group">';
            tokens.forEach(function(token) {
                tokenList += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${token.name || '[[caiz:unnamed-token]]'}</strong>
                            <small class="text-muted d-block">${token.description || ''}</small>
                        </div>
                        <button class="btn btn-sm btn-danger" data-token-id="${token.id}">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                `;
            });
            tokenList += '</div>';
            modal.find('.bootbox-body').html(tokenList);
            
            // Bind delete handlers
            modal.find('[data-token-id]').on('click', function() {
                const tokenId = $(this).data('token-id');
                APITokens.confirmDelete(tokenId);
            });
        }
    };

    // Show create token dialog
    APITokens.showCreateDialog = function() {
        bootbox.prompt({
            title: '[[caiz:create-api-token]]',
            inputType: 'text',
            placeholder: '[[caiz:token-name-placeholder]]',
            callback: function(name) {
                if (name) {
                    APITokens.createToken({ name: name });
                }
            }
        });
    };

    // Create new API token
    APITokens.createToken = function(tokenData) {
        window.socket.emit('modules.apiTokens.create', tokenData, function(err, result) {
            if (err) {
                app.alertError(err.message);
                return;
            }
            app.alertSuccess('[[caiz:api-token-created]]');
            
            // Show the new token to the user
            if (result && result.token) {
                bootbox.alert({
                    title: '[[caiz:api-token-created]]',
                    message: `
                        <div class="alert alert-warning">
                            <strong>[[caiz:save-token-warning]]</strong>
                        </div>
                        <div class="form-group">
                            <label>[[caiz:api-token]]</label>
                            <div class="input-group">
                                <input type="text" class="form-control" value="${result.token}" readonly id="new-token-value">
                                <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText(document.getElementById('new-token-value').value); app.alertSuccess('[[caiz:token-copied]]');">
                                    <i class="fa fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    `,
                    callback: function() {
                        APITokens.loadTokens(); // Reload token list
                    }
                });
            }
        });
    };

    // Confirm token deletion
    APITokens.confirmDelete = function(tokenId) {
        bootbox.confirm('[[caiz:confirm-delete-token]]', function(confirmed) {
            if (confirmed) {
                APITokens.deleteToken(tokenId);
            }
        });
    };

    // Delete API token
    APITokens.deleteToken = function(tokenId) {
        window.socket.emit('modules.apiTokens.delete', { tokenId: tokenId }, function(err, result) {
            if (err) {
                app.alertError(err.message);
                return;
            }
            app.alertSuccess('[[caiz:api-token-deleted]]');
            APITokens.loadTokens(); // Reload token list
        });
    };

    // Bind click handlers to menu items
    $(document).on('click', '[component="sidebar/api-tokens/list"]', function(e) {
        e.preventDefault();
        APITokens.loadTokens();
    });

    $(document).on('click', '[component="sidebar/api-tokens/create"]', function(e) {
        e.preventDefault();
        APITokens.showCreateDialog();
    });

    $(document).on('click', '[component="sidebar/api-tokens/docs"]', function(e) {
        e.preventDefault();
        // Open API documentation in new tab
        window.open('/api/docs', '_blank');
    });

    // Export for global access
    window.APITokens = APITokens;
});