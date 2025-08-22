<div class="acp-page-container">
    <div component="settings/main" class="auto-translate-settings">
        <div class="row">
            <div class="col-sm-2 col-12 settings-header">
                [[auto-translate:title]]
            </div>
            <div class="col-sm-10 col-12">
                <div class="alert alert-info">
                    <strong>[[auto-translate:description]]</strong>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title">[[auto-translate:api-settings]]</h5>
                    </div>
                    <div class="card-body">
                        <form id="auto-translate-settings">
                            <div class="row mb-3">
                                <label class="col-sm-3 col-form-label" for="gemini-api-key">[[auto-translate:api-key]]</label>
                                <div class="col-sm-9">
                                    <div class="input-group">
                                        <input type="password" id="gemini-api-key" name="geminiApiKey" class="form-control" placeholder="AIzaSy...">
                                        <button class="btn btn-outline-secondary" type="button" id="test-connection">
                                            <i class="fa fa-plug"></i> [[auto-translate:test-connection]]
                                        </button>
                                    </div>
                                    <div class="form-text">
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank">[[auto-translate:get-api-key]]</a>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="card-title">[[auto-translate:prompt-settings]]</h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <label class="col-sm-3 col-form-label" for="system-prompt">[[auto-translate:system-prompt]]</label>
                            <div class="col-sm-9">
                                <textarea id="system-prompt" name="systemPrompt" class="form-control" rows="4"></textarea>
                                <div class="form-text">[[auto-translate:system-prompt-help]]</div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-sm-3"></div>
                            <div class="col-sm-9">
                                <button type="button" id="preview-prompt" class="btn btn-outline-info">
                                    <i class="fa fa-eye"></i> [[auto-translate:preview-prompt]]
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-12">
                        <button type="button" id="save-settings" class="btn btn-primary">
                            <i class="fa fa-save"></i> [[auto-translate:save]]
                        </button>
                        <button type="button" id="reset-settings" class="btn btn-outline-secondary ms-2">
                            <i class="fa fa-undo"></i> [[auto-translate:reset]]
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Preview Modal -->
<div class="modal fade" id="prompt-preview-modal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">[[auto-translate:prompt-preview]]</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <pre id="prompt-preview-content" class="bg-light p-3 rounded"></pre>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">[[auto-translate:close]]</button>
            </div>
        </div>
    </div>
</div>