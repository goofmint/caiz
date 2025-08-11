<div class="acp-page-container">
    <div class="row">
        <div class="col-lg-9">
            <div class="panel panel-default">
                <div class="panel-heading">[[ai-moderation:settings]]</div>
                <div class="panel-body">
                    <form role="form" class="ai-moderation-settings" method="post">
                        <input type="hidden" name="_csrf" value="{config.csrf_token}" />
                        <div class="form-group">
                            <label for="api-provider">[[ai-moderation:api-provider]]</label>
                            <select class="form-control" id="api-provider" name="provider">
                                <option value="openai">OpenAI</option>
                                <option value="anthropic" disabled>Anthropic (Coming Soon)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="api-key">[[ai-moderation:api-key]]</label>
                            <input type="password" id="api-key" name="apiKey" 
                                   class="form-control" placeholder="Enter your API key">
                            <p class="help-block" id="api-key-status"></p>
                        </div>
                        
                        <div class="form-group">
                            <label for="threshold-flag">[[ai-moderation:threshold-flag]] (0-100)</label>
                            <input type="number" id="threshold-flag" name="thresholdFlag" 
                                   class="form-control" min="0" max="100" value="70">
                            <p class="help-block">
                                Content scoring above this threshold will be flagged for review
                            </p>
                        </div>
                        
                        <div class="form-group">
                            <label for="threshold-reject">[[ai-moderation:threshold-reject]] (0-100)</label>
                            <input type="number" id="threshold-reject" name="thresholdReject" 
                                   class="form-control" min="0" max="100" value="90">
                            <p class="help-block">
                                Content scoring above this threshold will be automatically rejected
                            </p>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="enable-content-hashing" name="enableContentHashing" checked>
                                Enable Content Hashing
                            </label>
                            <p class="help-block">
                                Store SHA256 hashes of content for integrity verification
                            </p>
                        </div>

                        <div class="form-group">
                            <label for="log-retention-days">Log Retention (days)</label>
                            <input type="number" id="log-retention-days" name="logRetentionDays" 
                                   class="form-control" min="1" max="365" value="90">
                            <p class="help-block">
                                Number of days to retain moderation logs
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            <div class="panel panel-default">
                <div class="panel-heading">Statistics</div>
                <div class="panel-body">
                    <div class="row" id="stats-container">
                        <div class="col-md-3">
                            <div class="stat-box">
                                <h4 id="stat-total">-</h4>
                                <p>Total Moderated</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-box">
                                <h4 id="stat-approved">-</h4>
                                <p>Approved</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-box">
                                <h4 id="stat-flagged">-</h4>
                                <p>Flagged</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-box">
                                <h4 id="stat-rejected">-</h4>
                                <p>Rejected</p>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12">
                            <p><strong>Average Score:</strong> <span id="stat-avg-score">-</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-lg-3">
            <div class="panel panel-default">
                <div class="panel-heading">Control Panel</div>
                <div class="panel-body">
                    <button class="btn btn-primary btn-block" id="save">
                        <i class="fa fa-save"></i> [[ai-moderation:save-settings]]
                    </button>
                    
                    <button class="btn btn-info btn-block" id="test-connection">
                        <i class="fa fa-plug"></i> Test API Connection
                    </button>
                    
                    <button class="btn btn-warning btn-block" id="cleanup-logs">
                        <i class="fa fa-trash"></i> Run Cleanup
                    </button>

                    <button class="btn btn-default btn-block" id="refresh-stats">
                        <i class="fa fa-refresh"></i> Refresh Statistics
                    </button>
                </div>
            </div>

            <div class="panel panel-default">
                <div class="panel-heading">System Status</div>
                <div class="panel-body">
                    <div class="status-item">
                        <strong>API Status:</strong>
                        <span id="api-status" class="label label-default">Unknown</span>
                    </div>
                    <div class="status-item">
                        <strong>Circuit Breaker:</strong>
                        <span id="circuit-status" class="label label-default">Unknown</span>
                    </div>
                    <div class="status-item">
                        <strong>Last Cleanup:</strong>
                        <span id="last-cleanup">-</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.stat-box {
    text-align: center;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 5px;
    margin-bottom: 10px;
}

.stat-box h4 {
    margin: 0;
    font-size: 24px;
    font-weight: bold;
    color: #337ab7;
}

.status-item {
    margin-bottom: 10px;
}

.status-item:last-child {
    margin-bottom: 0;
}
</style>