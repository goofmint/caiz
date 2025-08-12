<div class="acp-page-container">
    <div class="row">
        <div class="col-lg-12">
            <div class="panel panel-default">
                <div class="panel-heading">[[ai-moderation:settings]]</div>
                <div class="panel-body">
                    <form role="form" class="ai-moderation-settings">
                        <div class="form-group">
                            <label for="apiKey">[[ai-moderation:api-key]]</label>
                            <div class="row">
                                <div class="col-sm-8">
                                    <input type="password" id="apiKey" name="apiKey" class="form-control" />
                                </div>
                                <div class="col-sm-4">
                                    <button type="button" class="btn btn-sm btn-secondary" id="test-connection">[[ai-moderation:test-connection]]</button>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="flagUser">[[ai-moderation:flag-user]]</label>
                            <div class="row">
                                <div class="col-sm-8">
                                    <div class="input-group">
                                        <input type="text" id="flagUserSearch" class="form-control" placeholder="[[ai-moderation:search-user]]" />
                                        <span class="input-group-btn">
                                            <button class="btn btn-default" type="button" id="flagUserSearchBtn">
                                                <i class="fa fa-search"></i>
                                            </button>
                                        </span>
                                    </div>
                                    <input type="hidden" id="flagUid" name="flagUid" value="1" />
                                    <div id="selectedUser" class="selected-user" style="margin-top: 10px;">
                                        <span class="label label-primary" id="selectedUserLabel">
                                            <i class="fa fa-user"></i> <span id="selectedUsername">UID: 1</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p class="help-block">[[ai-moderation:flag-user-help]]</p>
                        </div>

                        <div class="row">
                            <div class="col-sm-6">
                                <div class="form-group">
                                    <label for="thresholdFlag">[[ai-moderation:threshold-flag]]</label>
                                    <input type="number" id="thresholdFlag" name="thresholds.flag" class="form-control" min="0" max="100" step="1" value="70" />
                                    <p class="help-block">[[ai-moderation:threshold-flag-help]]</p>
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <div class="form-group">
                                    <label for="thresholdReject">[[ai-moderation:threshold-reject]]</label>
                                    <input type="number" id="thresholdReject" name="thresholds.reject" class="form-control" min="0" max="100" step="1" value="90" />
                                    <p class="help-block">[[ai-moderation:threshold-reject-help]]</p>
                                </div>
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 30px;">
                            <button type="button" class="btn btn-primary" id="save">[[ai-moderation:save-settings]]</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>