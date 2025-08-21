'use strict';

define('admin/plugins/ogp-embed/rules', [
    'jquery',
    'alerts',
    'api',
    'bootbox'
], function ($, alerts, api, bootbox) {
    const Rules = {};
    
    let currentRules = [];
    let editingRuleId = null;

    Rules.init = function () {
        // Load rules on init
        loadRules();

        // Event handlers
        $('#addRule, #addFirstRule').on('click', showAddRuleModal);
        $('#saveRule').on('click', saveRule);
        $('#testRule').on('click', testRule);
        $('#confirmDelete').on('click', confirmDelete);

        // Initialize drag and drop (will be enabled when rules are loaded)
        initDragAndDrop();
    };

    function initDragAndDrop() {
        // Simplified drag and drop using jQuery UI sortable (if available)
        // For now, disable drag functionality and use manual priority editing
        console.log('[ogp-embed] Drag and drop will be implemented later');
    }

    function loadRules() {
        socket.emit('admin.ogpEmbed.getRules', {}, function (err, rules) {
            if (err) {
                return alerts.error(err);
            }

            currentRules = rules;
            renderRules();
        });
    }

    function renderRules() {
        const $container = $('#rulesContainer');
        const $noRules = $('#noRules');
        const $rulesList = $('#rulesList');

        if (!currentRules || currentRules.length === 0) {
            $noRules.show();
            $rulesList.hide();
            return;
        }

        $noRules.hide();
        $rulesList.show().empty();

        currentRules.forEach(function (rule) {
            const $ruleItem = $(`
                <div class="list-group-item" data-rule-id="${rule.ruleId}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">
                                ${rule.name}
                                ${!rule.enabled ? '<span class="badge bg-secondary ms-2">Disabled</span>' : ''}
                                <span class="badge bg-info ms-2">Priority: ${rule.priority || 0}</span>
                            </h6>
                            <small class="text-muted font-monospace">${escapeHtml(rule.pattern)}</small>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary" data-action="toggle" data-rule-id="${rule.ruleId}">
                                <i class="fa fa-${rule.enabled ? 'eye-slash' : 'eye'}"></i>
                            </button>
                            <button class="btn btn-outline-primary" data-action="edit" data-rule-id="${rule.ruleId}">
                                <i class="fa fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" data-action="delete" data-rule-id="${rule.ruleId}">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `);

            $rulesList.append($ruleItem);
        });

        // Attach event handlers
        $rulesList.find('[data-action="edit"]').on('click', function () {
            const ruleId = $(this).data('rule-id');
            showEditRuleModal(ruleId);
        });

        $rulesList.find('[data-action="delete"]').on('click', function () {
            const ruleId = $(this).data('rule-id');
            showDeleteModal(ruleId);
        });

        $rulesList.find('[data-action="toggle"]').on('click', function () {
            const ruleId = $(this).data('rule-id');
            toggleRule(ruleId);
        });
    }

    function showAddRuleModal() {
        editingRuleId = null;
        $('#modalTitle').text('Add Embedding Rule');
        $('#ruleForm')[0].reset();
        $('#testResult').hide();
        $('#ruleModal').modal('show');
    }

    function showEditRuleModal(ruleId) {
        const rule = currentRules.find(r => r.ruleId === ruleId);
        if (!rule) {
            return alerts.error('Rule not found');
        }

        editingRuleId = ruleId;
        $('#modalTitle').text('Edit Embedding Rule');
        $('#ruleName').val(rule.name);
        $('#rulePattern').val(rule.pattern);
        $('#ruleTemplate').val(rule.template);
        $('#ruleEnabled').prop('checked', rule.enabled);
        $('#rulePriority').val(rule.priority || 0);
        $('#testResult').hide();
        $('#ruleModal').modal('show');
    }

    function saveRule() {
        const ruleData = {
            name: $('#ruleName').val(),
            pattern: $('#rulePattern').val(),
            template: $('#ruleTemplate').val(),
            enabled: $('#ruleEnabled').is(':checked'),
            priority: parseInt($('#rulePriority').val(), 10) || 0
        };

        if (!ruleData.name || !ruleData.pattern || !ruleData.template) {
            return alerts.error('Please fill in all required fields');
        }

        const action = editingRuleId ? 'updateRule' : 'createRule';
        const data = editingRuleId ? { ...ruleData, ruleId: editingRuleId } : ruleData;

        socket.emit(`admin.ogpEmbed.${action}`, data, function (err, rule) {
            if (err) {
                return alerts.error(err);
            }

            $('#ruleModal').modal('hide');
            alerts.success(`Rule ${editingRuleId ? 'updated' : 'created'} successfully`);
            loadRules();
        });
    }

    function testRule() {
        const testUrl = $('#testUrl').val();
        if (!testUrl) {
            return alerts.error('Please enter a test URL');
        }

        const rule = {
            name: $('#ruleName').val() || 'Test Rule',
            pattern: $('#rulePattern').val(),
            template: $('#ruleTemplate').val(),
            enabled: true
        };

        if (!rule.pattern || !rule.template) {
            return alerts.error('Please enter pattern and template');
        }

        socket.emit('admin.ogpEmbed.testRule', { rule, testUrl }, function (err, result) {
            if (err) {
                return alerts.error(err);
            }

            const $testResult = $('#testResult');
            const $alert = $('#testResultAlert');
            const $title = $('#testResultTitle');
            const $content = $('#testResultContent');
            const $preview = $('#testResultPreview');

            $testResult.show();

            if (result.matched) {
                $alert.removeClass('alert-danger').addClass('alert-success');
                $title.text('Match successful!');
                $content.html('<small>Preview:</small>');
                $preview.html(result.output || '').show();
            } else {
                $alert.removeClass('alert-success').addClass('alert-danger');
                $title.text('No match');
                $content.text(result.error || 'The URL did not match the pattern');
                $preview.hide();
            }
        });
    }

    function toggleRule(ruleId) {
        const rule = currentRules.find(r => r.ruleId === ruleId);
        if (!rule) {
            return;
        }

        const data = {
            ruleId: ruleId,
            name: rule.name,
            pattern: rule.pattern,
            template: rule.template,
            enabled: !rule.enabled,
            priority: rule.priority
        };

        socket.emit('admin.ogpEmbed.updateRule', data, function (err) {
            if (err) {
                return alerts.error(err);
            }

            loadRules();
        });
    }

    function showDeleteModal(ruleId) {
        const rule = currentRules.find(r => r.ruleId === ruleId);
        if (!rule) {
            return;
        }

        editingRuleId = ruleId;
        $('#deleteRuleName').text(rule.name);
        $('#deleteModal').modal('show');
    }

    function confirmDelete() {
        if (!editingRuleId) {
            return;
        }

        socket.emit('admin.ogpEmbed.deleteRule', editingRuleId, function (err) {
            if (err) {
                return alerts.error(err);
            }

            $('#deleteModal').modal('hide');
            alerts.success('Rule deleted successfully');
            loadRules();
        });
    }


    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    return Rules;
});