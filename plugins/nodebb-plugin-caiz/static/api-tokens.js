'use strict';

$(document).ready(function() {
    const APITokens = {};
    let alerts = null;
    
    // Initialize alerts module once
    require(['alerts'], function(alertsModule) {
        alerts = alertsModule;
    });

    // Load API tokens from server (legacy function)
    APITokens.loadTokens = function() {
        APITokens.showListModal();
    };

    // Show API token list modal
    APITokens.showListModal = function() {
        // Check if modal already exists
        if ($('#api-token-list-modal').length) {
            $('#api-token-list-modal').modal('show');
            APITokens.loadTokensForModal();
            return;
        }
        
        // Load and render template using NodeBB's standard method
        app.parseAndTranslate('partials/modals/api-token-list', {}, function(html) {
            $('body').append(html);
            
            const modal = $('#api-token-list-modal');
            modal.modal('show');
            
            // Load tokens
            APITokens.loadTokensForModal();
            
            // Bind create button handlers
            modal.find('#create-new-token, #create-first-token').off('click').on('click', function() {
                APITokens.showCreateDialog();
            });
        });
    };

    // Load tokens for modal display
    APITokens.loadTokensForModal = function() {
        $('#token-loading').removeClass('d-none');
        $('#token-empty-state').addClass('d-none');
        $('#token-list-container').addClass('d-none');
        
        window.socket.emit('modules.apiTokens.get', {}, function(err, tokens) {
            $('#token-loading').addClass('d-none');
            
            if (err) {
                alerts && alerts.error(err.message);
                return;
            }
            
            APITokens.renderTokenList(tokens);
        });
    };

    // Render token list in modal
    APITokens.renderTokenList = function(tokens) {
        if (!tokens || tokens.length === 0) {
            $('#token-empty-state').removeClass('d-none');
            return;
        }
        
        let tokenListHtml = '';
        tokens.forEach(function(token) {
            const createdDate = token.created_at ? new Date(token.created_at).toLocaleDateString() : '[[caiz:unknown]]';
            
            tokenListHtml += `
                <div class="token-item border rounded p-3 mb-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${token.name || '[[caiz:unnamed-token]]'}</h6>
                            <small class="text-muted">[[caiz:token-created]]: ${createdDate}</small>
                        </div>
                        <div class="token-actions">
                            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-token-id="${token.id}">
                                <i class="fa fa-trash"></i> [[caiz:delete-token]]
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        $('#token-list-container').html(tokenListHtml).removeClass('d-none');
        
        // Bind action handlers
        $('#token-list-container').off('click', '[data-action]').on('click', '[data-action]', function(e) {
            e.preventDefault();
            const action = $(this).data('action');
            const tokenId = $(this).data('token-id');
            
            if (action === 'delete') {
                APITokens.handleTokenDelete(tokenId);
            }
        });
    };

    // Handle token deletion
    APITokens.handleTokenDelete = function(tokenId) {
        bootbox.confirm('[[caiz:confirm-delete-token]]', function(confirmed) {
            if (!confirmed) return;
            
            window.socket.emit('modules.apiTokens.delete', { tokenId: tokenId }, function(err, result) {
                if (err) {
                    alerts && alerts.error(err.message);
                    return;
                }
                
                alerts && alerts.success('[[caiz:api-token-deleted]]');
                APITokens.loadTokensForModal(); // Reload token list
            });
        });
    };

    // Legacy function for backward compatibility
    APITokens.displayTokens = function(tokens) {
        // Use new modal implementation
        APITokens.showListModal();
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
                alerts && alerts.error(err.message);
                return;
            }
            alerts && alerts.success('[[caiz:api-token-created]]');
            
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
                                <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText(document.getElementById('new-token-value').value); window.APITokens && window.APITokens.showCopySuccess && window.APITokens.showCopySuccess();">
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
                alerts && alerts.error(err.message);
                return;
            }
            alerts && alerts.success('[[caiz:api-token-deleted]]');
            APITokens.loadTokens(); // Reload token list
        });
    };

    // Bind click handlers to menu items
    $(document).on('click', '[component="sidebar/api-tokens/list"]', function(e) {
        e.preventDefault();
        APITokens.showListModal();
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

    // Add copy success function for inline onclick
    APITokens.showCopySuccess = function() {
        alerts && alerts.success('[[caiz:token-copied]]');
    };

    // Export for global access
    window.APITokens = APITokens;
});