<div class="settings-header">
    <h2 class="fw-bold tracking-tight">
        <i class="fa fa-link"></i> OGP Embed Rules
    </h2>
    <p class="text-muted">Configure regex-based URL embedding rules</p>
</div>

<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Embedding Rules</h5>
                    <button class="btn btn-primary btn-sm" id="addRule">
                        <i class="fa fa-plus"></i> Add Rule
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <i class="fa fa-info-circle"></i> 
                    Rules are processed in order from top to bottom. The first matching rule will be applied.
                    If no rules match, standard OGP embedding will be used.
                </div>
                
                <div id="rulesContainer">
                    <div class="text-center text-muted py-5" id="noRules">
                        <i class="fa fa-inbox fa-3x mb-3"></i>
                        <p>No embedding rules configured</p>
                        <button class="btn btn-primary" id="addFirstRule">
                            <i class="fa fa-plus"></i> Create Your First Rule
                        </button>
                    </div>
                    
                    <div class="list-group" id="rulesList" style="display: none;">
                        <!-- Rules will be populated here -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Rule Edit Modal -->
<div class="modal fade" id="ruleModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <span id="modalTitle">Add Embedding Rule</span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="ruleForm">
                    <div class="mb-3">
                        <label for="ruleName" class="form-label">Rule Name</label>
                        <input type="text" class="form-control" id="ruleName" required>
                        <small class="form-text text-muted">
                            A descriptive name for this rule (e.g., "YouTube Embed")
                        </small>
                    </div>
                    
                    <div class="mb-3">
                        <label for="rulePattern" class="form-label">URL Pattern (Regex)</label>
                        <input type="text" class="form-control font-monospace" id="rulePattern" required>
                        <small class="form-text text-muted">
                            Regular expression to match URLs. Use capture groups with parentheses.
                            <br>Example: <code>^https?://youtu\.be/([a-zA-Z0-9_-]{11})$</code>
                        </small>
                    </div>
                    
                    <div class="mb-3">
                        <label for="ruleTemplate" class="form-label">HTML Template</label>
                        <textarea class="form-control font-monospace" id="ruleTemplate" rows="6" required></textarea>
                        <small class="form-text text-muted">
                            HTML template with placeholders. Use $1, $2, etc. for capture groups.
                            <br>Example: <code>&lt;iframe src="https://youtube.com/embed/$1"&gt;&lt;/iframe&gt;</code>
                        </small>
                    </div>
                    
                    <div class="mb-3">
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input" id="ruleEnabled" checked>
                            <label class="form-check-label" for="ruleEnabled">
                                Enable this rule
                            </label>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="rulePriority" class="form-label">Priority</label>
                        <input type="number" class="form-control" id="rulePriority" min="0" max="9999" value="0">
                        <small class="form-text text-muted">
                            Lower numbers have higher priority (0 = highest)
                        </small>
                    </div>
                    
                    <!-- Test Section -->
                    <div class="card bg-light">
                        <div class="card-header">
                            <h6 class="mb-0">Test Rule</h6>
                        </div>
                        <div class="card-body">
                            <div class="input-group mb-3">
                                <input type="text" class="form-control" id="testUrl" placeholder="Enter a test URL">
                                <button class="btn btn-outline-secondary" type="button" id="testRule">
                                    <i class="fa fa-flask"></i> Test
                                </button>
                            </div>
                            <div id="testResult" style="display: none;">
                                <div class="alert" id="testResultAlert">
                                    <strong id="testResultTitle"></strong>
                                    <div id="testResultContent"></div>
                                </div>
                                <div id="testResultPreview"></div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="saveRule">Save Rule</button>
            </div>
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Confirm Delete</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this rule?</p>
                <p class="fw-bold" id="deleteRuleName"></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
            </div>
        </div>
    </div>
</div>