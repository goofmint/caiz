<div class="tab-pane" id="x-notification-settings">
  <div class="x-notification-container" data-cid="{cid}">
    <div class="row">
      <div class="col-md-12">
        <h4>[[caiz:x-notifications]]</h4>
        
        <div class="form-group">
          <label>[[caiz:x-connected-to]]</label>
          <div class="x-accounts-list">
            <p class="text-muted">Loading...</p>
          </div>
          <button class="btn btn-primary btn-connect-x" style="margin-top: 10px;">
            <i class="fa fa-twitter"></i> [[caiz:connect-to-x]]
          </button>
        </div>
        
        <div class="form-group x-events-section" style="display:none;">
          <label>[[caiz:notification-events]]</label>
          <div class="checkbox">
            <label>
              <input type="checkbox" name="newTopic" class="x-event-toggle">
              [[caiz:notify-new-topic]]
            </label>
          </div>
          <div class="checkbox">
            <label>
              <input type="checkbox" name="newPost" class="x-event-toggle">
              [[caiz:notify-new-post]]
            </label>
          </div>
          <div class="checkbox">
            <label>
              <input type="checkbox" name="memberJoin" class="x-event-toggle">
              [[caiz:notify-member-join]]
            </label>
          </div>
          <div class="checkbox">
            <label>
              <input type="checkbox" name="memberLeave" class="x-event-toggle">
              [[caiz:notify-member-leave]]
            </label>
          </div>
        </div>
        
        <div class="form-group x-templates-section" style="display:none;">
          <label>Message Templates</label>
          <div class="form-group">
            <label>New Topic</label>
            <textarea class="form-control x-template" name="newTopic" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>New Post</label>
            <textarea class="form-control x-template" name="newPost" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Member Join</label>
            <textarea class="form-control x-template" name="memberJoin" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label>Member Leave</label>
            <textarea class="form-control x-template" name="memberLeave" rows="2"></textarea>
          </div>
          <p class="help-block">
            Available variables: {username}, {topicTitle}, {postContent}, {communityName}, {url}
          </p>
        </div>
        
        <div class="form-group x-test-section" style="display:none;">
          <label>Test Post</label>
          <div class="input-group">
            <input type="text" class="form-control x-test-message" placeholder="Enter test message">
            <span class="input-group-btn">
              <button class="btn btn-default btn-test-x" type="button">
                <i class="fa fa-send"></i> Send Test
              </button>
            </span>
          </div>
        </div>
        
        <button class="btn btn-success btn-save-x-settings" style="display:none;">
          <i class="fa fa-save"></i> [[caiz:save-x-settings]]
        </button>
      </div>
    </div>
  </div>
</div>