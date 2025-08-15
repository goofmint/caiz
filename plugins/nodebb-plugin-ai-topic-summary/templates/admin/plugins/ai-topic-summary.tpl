<div class="acp-page-container">
  <div component="settings/main" class="row settings">
    <div class="col-sm-2 col-xs-12 settings-header">
      <div class="panel panel-default">
        <div class="panel-heading">[[ai-topic-summary:admin.title]]</div>
        <div class="panel-body">
          <button id="save-settings" class="btn btn-primary">[[ai-topic-summary:admin.save-settings]]</button>
        </div>
      </div>
    </div>

    <div class="col-sm-10 col-xs-12">
      <form role="form" class="ai-summary-settings">
        <div class="ai-summary-admin-card">
          <h4 class="ai-summary-admin-title">
            <i class="fas fa-cog"></i>
            [[ai-topic-summary:admin.configuration]]
          </h4>
          
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            <strong>[[ai-topic-summary:admin.about-title]]</strong>
            [[ai-topic-summary:admin.about-description]]
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-floating mb-3">
                <input type="text" class="form-control" id="gemini-api-key" name="geminiApiKey" placeholder="[[ai-topic-summary:admin.api-key-placeholder]]" data-key="geminiApiKey">
                <label for="gemini-api-key">[[ai-topic-summary:admin.api-key]]</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3 d-flex align-items-end">
                <button type="button" id="test-connection" class="btn btn-outline-primary">
                  <i class="fas fa-plug me-1"></i>[[ai-topic-summary:admin.test-connection]]
                </button>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-floating mb-3">
                <select class="form-select" id="trigger-count" name="triggerCount" data-key="triggerCount">
                  <option value="10" selected>10 posts</option>
                  <option value="15">15 posts</option>
                  <option value="20">20 posts</option>
                  <option value="25">25 posts</option>
                  <option value="30">30 posts</option>
                </select>
                <label for="trigger-count">[[ai-topic-summary:admin.trigger-count]]</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-floating mb-3">
                <select class="form-select" id="ai-model" name="aiModel" data-key="aiModel">
                  <option value="gemini-2.5-flash" selected>Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                </select>
                <label for="ai-model">[[ai-topic-summary:admin.ai-model]]</label>
              </div>
            </div>
          </div>

        </div>

        <div class="ai-summary-admin-card">
          <h4 class="ai-summary-admin-title">
            <i class="fas fa-palette"></i>
            [[ai-topic-summary:admin.display-settings]]
          </h4>

          <div class="row">
            <div class="col-md-6">
              <div class="form-floating mb-3">
                <select class="form-select" id="default-state" name="defaultState" data-key="defaultState">
                  <option value="expanded" selected>Expanded</option>
                  <option value="collapsed">Collapsed</option>
                </select>
                <label for="default-state">[[ai-topic-summary:admin.default-state]]</label>
              </div>
            </div>
          </div>
        </div>

        <div class="ai-summary-admin-card">
          <h4 class="ai-summary-admin-title">
            <i class="fas fa-info-circle"></i>
            [[ai-topic-summary:admin.setup-instructions]]
          </h4>
          
          <div class="alert alert-info">
            <h6><i class="fas fa-key me-1"></i>[[ai-topic-summary:admin.api-key-instructions-title]]</h6>
            <ol class="mb-2">
              <li>[[ai-topic-summary:admin.api-key-step1]]</li>
              <li>[[ai-topic-summary:admin.api-key-step2]]</li>
              <li>[[ai-topic-summary:admin.api-key-step3]]</li>
              <li>[[ai-topic-summary:admin.api-key-step4]]</li>
              <li>[[ai-topic-summary:admin.api-key-step5]]</li>
            </ol>
            <p class="mb-0">
              <strong>[[ai-topic-summary:admin.note]]</strong> [[ai-topic-summary:admin.pricing-note]]
            </p>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>

