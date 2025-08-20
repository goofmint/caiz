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
                                OGP Embed Settings
                            </h5>
                        </div>
                        <div class="card-body">
                            <form role="form" class="ogp-embed-settings">
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input type="checkbox" class="form-check-input" id="enabled" name="enabled" />
                                        <label for="enabled" class="form-check-label">Enable OGP Embed</label>
                                        <p class="form-text">Enable automatic embedding of OGP previews for URLs in posts</p>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="timeout" class="form-label">Request Timeout (seconds)</label>
                                    <input type="number" id="timeout" name="timeout" title="Request Timeout" class="form-control" placeholder="5" min="1" max="30" />
                                    <p class="form-text">Maximum time to wait for OGP data from external sites</p>
                                </div>

                                <div class="mb-3">
                                    <label for="cacheTTL" class="form-label">Cache TTL (hours)</label>
                                    <input type="number" id="cacheTTL" name="cacheTTL" title="Cache TTL" class="form-control" placeholder="24" min="1" max="168" />
                                    <p class="form-text">How long to cache OGP data (in hours)</p>
                                </div>

                                <div class="mb-3">
                                    <label for="maxDescriptionLength" class="form-label">Max Description Length</label>
                                    <input type="number" id="maxDescriptionLength" name="maxDescriptionLength" title="Max Description Length" class="form-control" placeholder="200" min="50" max="500" />
                                    <p class="form-text">Maximum character length for description preview</p>
                                </div>

                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input type="checkbox" class="form-check-input" id="showFavicon" name="showFavicon" />
                                        <label for="showFavicon" class="form-check-label">Show Favicons</label>
                                        <p class="form-text">Display website favicons in OGP cards</p>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input type="checkbox" class="form-check-input" id="openInNewTab" name="openInNewTab" />
                                        <label for="openInNewTab" class="form-check-label">Open Links in New Tab</label>
                                        <p class="form-text">Open OGP links in new browser tabs</p>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="userAgentString" class="form-label">Custom User Agent</label>
                                    <input type="text" id="userAgentString" name="userAgentString" title="User Agent" class="form-control" placeholder="Mozilla/5.0 (compatible; NodeBB OGP Embed Bot/1.0)" />
                                    <p class="form-text">Custom user agent string for OGP requests (leave empty for default)</p>
                                </div>

                                <div class="mb-3">
                                    <label for="whitelist" class="form-label">Domain Whitelist</label>
                                    <textarea id="whitelist" name="whitelist" title="Whitelist" class="form-control" rows="3" placeholder="example.com&#10;trusted-site.org"></textarea>
                                    <p class="form-text">Allowed domains (one per line, leave empty to allow all)</p>
                                </div>

                                <div class="mb-3">
                                    <label for="blacklist" class="form-label">Domain Blacklist</label>
                                    <textarea id="blacklist" name="blacklist" title="Blacklist" class="form-control" rows="3" placeholder="spam-site.com&#10;blocked-domain.net"></textarea>
                                    <p class="form-text">Blocked domains (one per line)</p>
                                </div>

                                <hr />

                                <div class="d-flex justify-content-between">
                                    <button id="save" type="button" class="btn btn-primary">Save Settings</button>
                                    <button id="clear-cache" type="button" class="btn btn-warning">Clear All Cache</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-sm-4 col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title">Cache Statistics</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6>Cache Status</h6>
                                <div id="cache-stats">
                                    <p class="text-muted">Loading...</p>
                                </div>
                            </div>

                            <div class="mb-3">
                                <h6>Test OGP Parsing</h6>
                                <div class="input-group">
                                    <input type="url" id="test-url" class="form-control" placeholder="https://example.com" />
                                    <button id="test-parse" type="button" class="btn btn-outline-secondary">Test</button>
                                </div>
                                <div id="test-result" class="mt-2"></div>
                            </div>
                        </div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-header">
                            <h5 class="card-title">Plugin Information</h5>
                        </div>
                        <div class="card-body">
                            <dl class="row">
                                <dt class="col-6">Version:</dt>
                                <dd class="col-6">1.0.0</dd>
                                <dt class="col-6">Author:</dt>
                                <dd class="col-6">NodeBB Team</dd>
                                <dt class="col-6">License:</dt>
                                <dd class="col-6">MIT</dd>
                            </dl>
                            <p class="text-muted small">
                                This plugin automatically embeds Open Graph Protocol previews for URLs in posts.
                                It provides caching, security features, and responsive design.
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
                title: 'Settings Saved',
                message: 'OGP Embed settings have been saved successfully.',
                timeout: 2000
            });
        });
    });

    $('#clear-cache').on('click', function() {
        const btn = $(this);
        btn.prop('disabled', true).text('Clearing...');

        $.ajax({
            url: '/api/ogp-embed/cache/clear',
            method: 'POST',
            headers: {
                'x-csrf-token': config.csrf_token
            },
            success: function() {
                app.alert({
                    type: 'success',
                    alert_id: 'ogp-cache-cleared',
                    title: 'Cache Cleared',
                    message: 'All OGP cache has been cleared successfully.',
                    timeout: 2000
                });
                loadCacheStats();
            },
            error: function() {
                app.alert({
                    type: 'danger',
                    alert_id: 'ogp-cache-error',
                    title: 'Error',
                    message: 'Failed to clear cache. Please try again.',
                    timeout: 3000
                });
            },
            complete: function() {
                btn.prop('disabled', false).text('Clear All Cache');
            }
        });
    });

    $('#test-parse').on('click', function() {
        const url = $('#test-url').val();
        const btn = $(this);
        const result = $('#test-result');

        if (!url) {
            result.html('<div class="alert alert-warning">Please enter a URL to test</div>');
            return;
        }

        btn.prop('disabled', true).text('Testing...');
        result.html('<div class="text-muted">Parsing OGP data...</div>');

        $.ajax({
            url: '/api/ogp-embed/fetch',
            method: 'GET',
            data: { url: url },
            success: function(data) {
                if (data && data.title) {
                    result.html(`
                        <div class="alert alert-success">
                            <strong>Success!</strong><br>
                            <strong>Title:</strong> ${data.title}<br>
                            <strong>Description:</strong> ${data.description || 'N/A'}<br>
                            <strong>Domain:</strong> ${data.domain}
                        </div>
                    `);
                } else {
                    result.html('<div class="alert alert-warning">No OGP data found for this URL</div>');
                }
            },
            error: function() {
                result.html('<div class="alert alert-danger">Failed to parse OGP data</div>');
            },
            complete: function() {
                btn.prop('disabled', false).text('Test');
            }
        });
    });

    function loadCacheStats() {
        // In a real implementation, you would fetch cache statistics from the server
        $('#cache-stats').html(`
            <div class="d-flex justify-content-between">
                <span>Status:</span>
                <span class="text-success">Active</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>TTL:</span>
                <span>24 hours</span>
            </div>
            <small class="text-muted">Cache statistics not yet implemented</small>
        `);
    }

    // Load cache stats on page load
    loadCacheStats();
});
</script>