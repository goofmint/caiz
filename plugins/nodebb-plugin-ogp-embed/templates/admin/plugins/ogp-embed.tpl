<div class="acp-page-container">
    <!-- IMPORT admin/partials/settings/header.tpl -->

    <div class="row m-0">
        <div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
            <div class="row">
                <div class="col-sm-8 col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title">
                                <i class="fa fa-link text-primary"></i>
                                [[ogp-embed:title]]
                            </h5>
                        </div>
                        <div class="card-body">
                            <form role="form" class="ogp-embed-settings">
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input type="checkbox" class="form-check-input" id="enabled" name="enabled" />
                                        <label for="enabled" class="form-check-label">[[ogp-embed:enable]]</label>
                                        <p class="form-text">[[ogp-embed:enable-help]]</p>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="timeout" class="form-label">[[ogp-embed:timeout]]</label>
                                    <input type="number" id="timeout" name="timeout" title="[[ogp-embed:timeout]]" class="form-control" placeholder="5" min="1" max="30" />
                                    <p class="form-text">[[ogp-embed:timeout-help]]</p>
                                </div>

                                <div class="mb-3">
                                    <label for="cacheTTL" class="form-label">[[ogp-embed:cache-ttl]]</label>
                                    <input type="number" id="cacheTTL" name="cacheTTL" title="[[ogp-embed:cache-ttl]]" class="form-control" placeholder="24" min="1" max="168" />
                                    <p class="form-text">[[ogp-embed:cache-ttl-help]]</p>
                                </div>

                                <div class="mb-3">
                                    <label for="maxDescriptionLength" class="form-label">[[ogp-embed:max-description]]</label>
                                    <input type="number" id="maxDescriptionLength" name="maxDescriptionLength" title="[[ogp-embed:max-description]]" class="form-control" placeholder="200" min="50" max="500" />
                                    <p class="form-text">[[ogp-embed:max-description-help]]</p>
                                </div>

                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input type="checkbox" class="form-check-input" id="showFavicon" name="showFavicon" />
                                        <label for="showFavicon" class="form-check-label">[[ogp-embed:show-favicon]]</label>
                                        <p class="form-text">[[ogp-embed:show-favicon-help]]</p>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input type="checkbox" class="form-check-input" id="openInNewTab" name="openInNewTab" />
                                        <label for="openInNewTab" class="form-check-label">[[ogp-embed:open-new-tab]]</label>
                                        <p class="form-text">[[ogp-embed:open-new-tab-help]]</p>
                                    </div>
                                </div>


                                <hr />

                                <div class="d-flex justify-content-between">
                                    <button id="save" type="button" class="btn btn-primary">[[ogp-embed:save]]</button>
                                    <button id="clear-cache" type="button" class="btn btn-warning">[[ogp-embed:clear-cache]]</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-sm-4 col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title">[[ogp-embed:cache-stats]]</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6>[[ogp-embed:cache-status]]</h6>
                                <div id="cache-stats">
                                    <p class="text-muted">[[ogp-embed:loading]]</p>
                                </div>
                            </div>

                            <div class="mb-3">
                                <h6>[[ogp-embed:test-ogp]]</h6>
                                <div class="input-group">
                                    <input type="url" id="test-url" class="form-control" placeholder="https://example.com" />
                                    <button id="test-parse" type="button" class="btn btn-outline-secondary">[[ogp-embed:test]]</button>
                                </div>
                                <div id="test-result" class="mt-2"></div>
                            </div>
                        </div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-header">
                            <h5 class="card-title">[[ogp-embed:plugin-info]]</h5>
                        </div>
                        <div class="card-body">
                            <dl class="row">
                                <dt class="col-6">[[ogp-embed:version]]:</dt>
                                <dd class="col-6">1.0.0</dd>
                                <dt class="col-6">[[ogp-embed:author]]:</dt>
                                <dd class="col-6">NodeBB Team</dd>
                                <dt class="col-6">[[ogp-embed:license]]:</dt>
                                <dd class="col-6">MIT</dd>
                            </dl>
                            <p class="text-muted small">
                                [[ogp-embed:description]]
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script type="text/javascript">
require(['admin/modules/settings'], function(Settings) {
    Settings.load('ogp-embed', $('.ogp-embed-settings'));

    $('#save').on('click', function() {
        Settings.save('ogp-embed', $('.ogp-embed-settings'), function() {
            app.alert({
                type: 'success',
                alert_id: 'ogp-embed-saved',
                title: '[[ogp-embed:save]]',
                message: '[[ogp-embed:settings-saved]]',
                timeout: 2000
            });
        });
    });

    $('#clear-cache').on('click', function() {
        const btn = $(this);
        btn.prop('disabled', true);
        
        socket.emit('admin.ogp-embed.clearCache', {}, function(err) {
            if (err) {
                app.alert({
                    type: 'danger',
                    alert_id: 'ogp-cache-error',
                    title: 'Error',
                    message: '[[ogp-embed:cache-error]]',
                    timeout: 3000
                });
            } else {
                app.alert({
                    type: 'success',
                    alert_id: 'ogp-cache-cleared',
                    title: '[[ogp-embed:clear-cache]]',
                    message: '[[ogp-embed:cache-cleared]]',
                    timeout: 2000
                });
                loadCacheStats();
            }
            btn.prop('disabled', false);
        });
    });

    $('#test-parse').on('click', function() {
        const url = $('#test-url').val();
        const btn = $(this);
        const result = $('#test-result');

        if (!url) {
            result.html('<div class="alert alert-warning">[[ogp-embed:enter-url]]</div>');
            return;
        }

        btn.prop('disabled', true);
        result.html('<div class="text-muted">[[ogp-embed:parsing]]</div>');

        socket.emit('ogp-embed.testParse', { url: url }, function(err, data) {
            if (err) {
                result.html('<div class="alert alert-danger">[[ogp-embed:parse-failed]]</div>');
            } else if (data && data.title) {
                result.html(
                    '<div class="alert alert-success">' +
                    '<strong>[[ogp-embed:success]]</strong><br>' +
                    '<strong>[[ogp-embed:title-label]]:</strong> ' + data.title + '<br>' +
                    '<strong>[[ogp-embed:description-label]]:</strong> ' + (data.description || 'N/A') + '<br>' +
                    '<strong>[[ogp-embed:domain-label]]:</strong> ' + data.domain +
                    '</div>'
                );
            } else {
                result.html('<div class="alert alert-warning">[[ogp-embed:no-data]]</div>');
            }
            btn.prop('disabled', false);
        });
    });

    function loadCacheStats() {
        $('#cache-stats').html(
            '<div class="d-flex justify-content-between">' +
            '<span>[[ogp-embed:cache-status]]:</span>' +
            '<span class="text-success">[[ogp-embed:active]]</span>' +
            '</div>' +
            '<div class="d-flex justify-content-between">' +
            '<span>TTL:</span>' +
            '<span>24 [[ogp-embed:hours]]</span>' +
            '</div>' +
            '<small class="text-muted">[[ogp-embed:cache-not-implemented]]</small>'
        );
    }

    loadCacheStats();
});
</script>