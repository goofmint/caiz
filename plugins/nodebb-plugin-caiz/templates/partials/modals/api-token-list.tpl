<div class="modal fade" id="api-token-list-modal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="api-token-list-modal-title">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="api-token-list-modal-title">[[caiz:api-tokens-management]]</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="[[global:close]]"></button>
            </div>
            <div class="modal-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">[[caiz:your-api-tokens]]</h6>
                    <button class="btn btn-primary btn-sm" id="create-new-token">
                        <i class="fa fa-plus"></i> [[caiz:create-api-token]]
                    </button>
                </div>
                
                <!-- Loading state -->
                <div id="token-loading" class="text-center py-4" role="status" aria-live="polite">
                    <i class="fa fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>[[caiz:loading-tokens]]</span>
                </div>
                
                <!-- Empty state -->
                <div id="token-empty-state" class="text-center py-4 d-none">
                    <i class="fa fa-key fa-3x text-muted mb-3"></i>
                    <h6>[[caiz:no-api-tokens]]</h6>
                    <p class="text-muted">[[caiz:no-tokens-description]]</p>
                    <button class="btn btn-outline-primary" id="create-first-token">
                        <i class="fa fa-plus"></i> [[caiz:create-first-token]]
                    </button>
                </div>
                
                <!-- Token list -->
                <div id="token-list-container" class="d-none">
                    <!-- Dynamic content will be inserted here via Benchpress templates or DOM APIs with proper escaping (no innerHTML with untrusted data). -->
                </div>
            </div>
        </div>
    </div>
</div>