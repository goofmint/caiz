<div class="acp-page-container">
    <div component="settings/main" class="auto-translate-settings">
        <div class="row">
            <div class="col-sm-2 col-12 settings-header">
                [[auto-translate:admin.title]]
            </div>
            <div class="col-sm-10 col-12">
                <div class="alert alert-info">
                    <strong>[[auto-translate:admin.description]]</strong><br>
                    [[auto-translate:admin.description-detail]]
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
                                        <input type="password" id="gemini-api-key" name="geminiApiKey" class="form-control" placeholder="[[auto-translate:admin.api-key-placeholder]]">
                                        <button class="btn btn-outline-secondary" type="button" id="test-connection">
                                            <i class="fa fa-plug"></i> [[auto-translate:admin.test-connection]]
                                        </button>
                                    </div>
                                    <div class="form-text">
                                        [[auto-translate:admin.api-key-help]]
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank">[[auto-translate:admin.get-api-key]]</a>
                                    </div>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <label class="col-sm-3 col-form-label" for="model">[[auto-translate:admin.model]]</label>
                                <div class="col-sm-9">
                                    <select id="model" name="model" class="form-select">
                                        <option value="gemini-pro">Gemini Pro</option>
                                        <option value="gemini-pro-vision">Gemini Pro Vision</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <label class="col-sm-3 col-form-label" for="max-tokens">[[auto-translate:admin.max-tokens]]</label>
                                <div class="col-sm-9">
                                    <input type="number" id="max-tokens" name="maxTokens" class="form-control" min="1" max="8192" value="2048">
                                    <div class="form-text">[[auto-translate:admin.max-tokens-help]]</div>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <label class="col-sm-3 col-form-label" for="temperature">[[auto-translate:admin.temperature]]</label>
                                <div class="col-sm-9">
                                    <input type="number" id="temperature" name="temperature" class="form-control" min="0" max="2" step="0.1" value="0.3">
                                    <div class="form-text">[[auto-translate:admin.temperature-help]]</div>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <label class="col-sm-3 col-form-label" for="timeout">[[auto-translate:admin.timeout]]</label>
                                <div class="col-sm-9">
                                    <input type="number" id="timeout" name="timeout" class="form-control" min="1" max="300" value="30">
                                    <div class="form-text">[[auto-translate:admin.timeout-help]]</div>
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
                                <textarea id="system-prompt" name="systemPrompt" class="form-control" rows="3" placeholder="[[auto-translate:admin.system-prompt-placeholder]]"></textarea>
                                <div class="form-text">[[auto-translate:admin.system-prompt-help]]</div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <label class="col-sm-3 col-form-label" for="translation-instruction">[[auto-translate:admin.translation-instruction]]</label>
                            <div class="col-sm-9">
                                <textarea id="translation-instruction" name="translationInstruction" class="form-control" rows="2" placeholder="[[auto-translate:admin.translation-instruction-placeholder]]"></textarea>
                                <div class="form-text">[[auto-translate:admin.translation-instruction-help]]</div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <label class="col-sm-3 col-form-label" for="context-preservation">[[auto-translate:admin.context-preservation]]</label>
                            <div class="col-sm-9">
                                <textarea id="context-preservation" name="contextPreservation" class="form-control" rows="2" placeholder="[[auto-translate:admin.context-preservation-placeholder]]"></textarea>
                                <div class="form-text">[[auto-translate:admin.context-preservation-help]]</div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <label class="col-sm-3 col-form-label" for="output-format">[[auto-translate:admin.output-format]]</label>
                            <div class="col-sm-9">
                                <textarea id="output-format" name="outputFormat" class="form-control" rows="2" placeholder="[[auto-translate:admin.output-format-placeholder]]"></textarea>
                                <div class="form-text">[[auto-translate:admin.output-format-help]]</div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-sm-3"></div>
                            <div class="col-sm-9">
                                <button type="button" id="preview-prompt" class="btn btn-outline-info">
                                    <i class="fa fa-eye"></i> [[auto-translate:admin.preview-prompt]]
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="card-title">[[auto-translate:admin.language-settings]]</h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <label class="col-sm-3 col-form-label" for="supported-languages">[[auto-translate:admin.supported-languages]]</label>
                            <div class="col-sm-9">
                                <select id="supported-languages" name="supportedLanguages" class="form-select" multiple>
                                    <!-- BEGIN supportedLanguages -->
                                    <option value="{supportedLanguages}">{supportedLanguages}</option>
                                    <!-- END supportedLanguages -->
                                </select>
                                <div class="form-text">[[auto-translate:admin.supported-languages-help]]</div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <label class="col-sm-3 col-form-label" for="default-language">[[auto-translate:admin.default-language]]</label>
                            <div class="col-sm-9">
                                <select id="default-language" name="defaultLanguage" class="form-select">
                                    <!-- BEGIN supportedLanguages -->
                                    <option value="{supportedLanguages}">{supportedLanguages}</option>
                                    <!-- END supportedLanguages -->
                                </select>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-sm-3"></div>
                            <div class="col-sm-9">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="auto-detection" name="autoDetection">
                                    <label class="form-check-label" for="auto-detection">
                                        [[auto-translate:admin.auto-detection]]
                                    </label>
                                    <div class="form-text">[[auto-translate:admin.auto-detection-help]]</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-12">
                        <button type="button" id="save-settings" class="btn btn-primary">
                            <i class="fa fa-save"></i> [[auto-translate:admin.save]]
                        </button>
                        <button type="button" id="reset-settings" class="btn btn-outline-secondary ms-2">
                            <i class="fa fa-undo"></i> [[auto-translate:admin.reset]]
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
                <h5 class="modal-title">[[auto-translate:admin.prompt-preview]]</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <pre id="prompt-preview-content" class="bg-light p-3 rounded"></pre>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">[[auto-translate:admin.close]]</button>
            </div>
        </div>
    </div>
</div>