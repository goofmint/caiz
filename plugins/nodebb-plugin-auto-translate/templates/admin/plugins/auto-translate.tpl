<div class="acp-page-container">
    <div component="settings/main" class="auto-translate-settings">
        <div class="row">
            <div class="col-sm-2 col-12 settings-header">
                [[auto-translate:admin.title]]
            </div>
            <div class="col-sm-10 col-12">
                <div class="alert alert-info">
                    <strong>[[auto-translate:admin.description]]</strong>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title">[[auto-translate:admin.api-settings]]</h5>
                    </div>
                    <div class="card-body">
                        <form id="auto-translate-settings">
                            <div class="row mb-3">
                                <label class="col-sm-3 col-form-label" for="gemini-api-key">[[auto-translate:admin.api-key]]</label>
                                <div class="col-sm-9">
                                    <div class="input-group">
                                        <input type="text" id="gemini-api-key" name="geminiApiKey" class="form-control" placeholder="AIzaSy...">
                                        <button class="btn btn-outline-secondary" type="button" id="test-connection">
                                            <i class="fa fa-plug"></i> [[auto-translate:admin.test-connection]]
                                        </button>
                                    </div>
                                    <div class="form-text">
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank">[[auto-translate:admin.get-api-key]]</a>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="card-title">[[auto-translate:admin.prompt-settings]]</h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <label class="col-sm-3 col-form-label" for="system-prompt">[[auto-translate:admin.system-prompt]]</label>
                            <div class="col-sm-9">
                                <textarea id="system-prompt" name="systemPrompt" class="form-control" rows="4"></textarea>
                                <div class="form-text">[[auto-translate:admin.system-prompt-help]]</div>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-12">
                        <button type="button" id="save-settings" class="btn btn-primary">
                            <i class="fa fa-save"></i> [[auto-translate:admin.save]]
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>