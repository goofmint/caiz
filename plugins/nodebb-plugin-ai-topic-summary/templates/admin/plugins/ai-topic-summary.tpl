<div class="acp-page-container">
  <div component="settings/main" class="row settings">
    <div class="col-sm-2 col-xs-12 settings-header">
      <div class="panel panel-default">
        <div class="panel-heading">AI Topic Summary</div>
        <div class="panel-body">
          <button id="save-settings" class="btn btn-primary">Save Settings</button>
        </div>
      </div>
    </div>

    <div class="col-sm-10 col-xs-12">
      <form role="form" class="ai-summary-settings">
        <div class="ai-summary-admin-card">
          <h4 class="ai-summary-admin-title">
            <i class="fas fa-cog"></i>
            Configuration
          </h4>
          
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            <strong>About AI Topic Summary:</strong>
            This plugin automatically generates AI-powered summaries for topics when they reach 10, 20, 30+ posts. 
            Summaries help users quickly understand the discussion flow without reading all messages.
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-floating mb-3">
                <input type="text" class="form-control" id="gemini-api-key" name="geminiApiKey" placeholder="Enter your Gemini API key" data-key="geminiApiKey">
                <label for="gemini-api-key">Gemini API Key</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3 d-flex align-items-end">
                <button type="button" id="test-connection" class="btn btn-outline-primary">
                  <i class="fas fa-plug me-1"></i>Test Connection
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
                <label for="trigger-count">Summary Generation Trigger</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-floating mb-3">
                <select class="form-select" id="ai-model" name="aiModel" data-key="aiModel">
                  <option value="gemini-1.5-flash" selected>Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
                <label for="ai-model">AI Model</label>
              </div>
            </div>
          </div>

          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="auto-generate" name="autoGenerate" data-key="autoGenerate" checked>
            <label class="form-check-label" for="auto-generate">
              Automatically generate summaries when trigger count is reached
            </label>
          </div>

          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="allow-manual" name="allowManual" data-key="allowManual" checked>
            <label class="form-check-label" for="allow-manual">
              Allow moderators to manually generate summaries
            </label>
          </div>
        </div>

        <div class="ai-summary-admin-card">
          <h4 class="ai-summary-admin-title">
            <i class="fas fa-palette"></i>
            Display Settings
          </h4>

          <div class="row">
            <div class="col-md-6">
              <div class="form-floating mb-3">
                <select class="form-select" id="default-state" name="defaultState" data-key="defaultState">
                  <option value="expanded" selected>Expanded</option>
                  <option value="collapsed">Collapsed</option>
                </select>
                <label for="default-state">Default Summary State</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-floating mb-3">
                <input type="number" class="form-control" id="min-posts" name="minPosts" value="10" min="1" max="100" data-key="minPosts">
                <label for="min-posts">Minimum Posts to Show Summary</label>
              </div>
            </div>
          </div>

          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="show-meta" name="showMeta" data-key="showMeta" checked>
            <label class="form-check-label" for="show-meta">
              Show summary metadata (post count, generation time, AI model)
            </label>
          </div>
        </div>

        <div class="ai-summary-admin-card">
          <h4 class="ai-summary-admin-title">
            <i class="fas fa-info-circle"></i>
            Setup Instructions
          </h4>
          
          <div class="alert alert-info">
            <h6><i class="fas fa-key me-1"></i>Getting a Gemini API Key:</h6>
            <ol class="mb-2">
              <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
              <li>Sign in with your Google account</li>
              <li>Click "Create API Key"</li>
              <li>Copy the generated API key and paste it above</li>
              <li>Click "Test Connection" to verify it works</li>
            </ol>
            <p class="mb-0">
              <strong>Note:</strong> Gemini API has a free tier with generous quotas. 
              For production use, consider reviewing Google's pricing.
            </p>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>

<script>
  require(['admin/plugins/ai-topic-summary'], function (plugin) {
    plugin.init();
  });
</script>