'use strict';

(function() {
  $(window).on('action:community.edit', function(event, data) {
    const { modal, cid } = data;
    
    // Add X notification tab to the modal
    const tabNav = modal.find('.nav-tabs');
    const tabContent = modal.find('.tab-content');
    
    // Add tab button
    tabNav.append(`
      <li><a href="#x-notification-settings" data-toggle="tab">
        <i class="fa fa-twitter"></i> [[x-notification:title]]
      </a></li>
    `);
    
    // Add tab content
    tabContent.append(`
      <div class="tab-pane" id="x-notification-settings">
        <div class="x-notification-container" data-cid="${cid}">
          <div class="row">
            <div class="col-md-12">
              <h4>[[x-notification:settings.title]]</h4>
              
              <div class="form-group">
                <label>[[x-notification:settings.connected-accounts]]</label>
                <div class="x-accounts-list">
                  <p class="text-muted">[[x-notification:settings.loading]]</p>
                </div>
                <button class="btn btn-primary btn-connect-x" style="margin-top: 10px;">
                  <i class="fa fa-twitter"></i> [[x-notification:settings.connect-account]]
                </button>
              </div>
              
              <div class="form-group x-events-section" style="display:none;">
                <label>[[x-notification:settings.events]]</label>
                <div class="checkbox">
                  <label>
                    <input type="checkbox" name="newTopic" class="x-event-toggle">
                    [[x-notification:settings.event.new-topic]]
                  </label>
                </div>
                <div class="checkbox">
                  <label>
                    <input type="checkbox" name="newPost" class="x-event-toggle">
                    [[x-notification:settings.event.new-post]]
                  </label>
                </div>
                <div class="checkbox">
                  <label>
                    <input type="checkbox" name="memberJoin" class="x-event-toggle">
                    [[x-notification:settings.event.member-join]]
                  </label>
                </div>
                <div class="checkbox">
                  <label>
                    <input type="checkbox" name="memberLeave" class="x-event-toggle">
                    [[x-notification:settings.event.member-leave]]
                  </label>
                </div>
              </div>
              
              <div class="form-group x-templates-section" style="display:none;">
                <label>[[x-notification:settings.templates]]</label>
                <div class="form-group">
                  <label>[[x-notification:settings.template.new-topic]]</label>
                  <textarea class="form-control x-template" name="newTopic" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label>[[x-notification:settings.template.new-post]]</label>
                  <textarea class="form-control x-template" name="newPost" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label>[[x-notification:settings.template.member-join]]</label>
                  <textarea class="form-control x-template" name="memberJoin" rows="2"></textarea>
                </div>
                <div class="form-group">
                  <label>[[x-notification:settings.template.member-leave]]</label>
                  <textarea class="form-control x-template" name="memberLeave" rows="2"></textarea>
                </div>
                <p class="help-block">
                  [[x-notification:settings.template-help]]
                </p>
              </div>
              
              <div class="form-group x-test-section" style="display:none;">
                <label>[[x-notification:settings.test]]</label>
                <div class="input-group">
                  <input type="text" class="form-control x-test-message" placeholder="[[x-notification:settings.test-placeholder]]">
                  <span class="input-group-btn">
                    <button class="btn btn-default btn-test-x" type="button">
                      <i class="fa fa-send"></i> [[x-notification:settings.test-button]]
                    </button>
                  </span>
                </div>
              </div>
              
              <button class="btn btn-success btn-save-x-settings" style="display:none;">
                <i class="fa fa-save"></i> [[x-notification:settings.save]]
              </button>
            </div>
          </div>
        </div>
      </div>
    `);
    
    // Load current settings
    loadXSettings(cid);
    
    // Event handlers
    modal.on('click', '.btn-connect-x', function() {
      connectXAccount(cid);
    });
    
    modal.on('click', '.btn-disconnect-x', function() {
      const accountId = $(this).data('account-id');
      disconnectXAccount(cid, accountId);
    });
    
    modal.on('click', '.btn-save-x-settings', function() {
      saveXSettings(cid);
    });
    
    modal.on('click', '.btn-test-x', function() {
      sendTestPost(cid);
    });
    
    modal.on('change', '.x-account-select', function() {
      const container = modal.find('.x-notification-container');
      container.find('.btn-save-x-settings').show();
    });
  });
  
  function loadXSettings(cid) {
    $.get(`/api/community/${cid}/x-settings`, function(data) {
      const container = $(`.x-notification-container[data-cid="${cid}"]`);
      
      // Update accounts list
      if (data.accounts && data.accounts.length > 0) {
        let accountsHtml = '<select class="form-control x-account-select">';
        accountsHtml += '<option value="">[[x-notification:settings.select-account]]</option>';
        
        data.accounts.forEach(account => {
          const selected = account.accountId === data.selectedAccountId ? 'selected' : '';
          accountsHtml += `<option value="${account.accountId}" ${selected}>@${account.screenName}</option>`;
        });
        
        accountsHtml += '</select>';
        accountsHtml += '<div class="account-actions" style="margin-top: 10px;">';
        
        data.accounts.forEach(account => {
          accountsHtml += `
            <button class="btn btn-xs btn-danger btn-disconnect-x" data-account-id="${account.accountId}">
              <i class="fa fa-times"></i> @${account.screenName}
            </button> `;
        });
        
        accountsHtml += '</div>';
        
        container.find('.x-accounts-list').html(accountsHtml);
        
        // Show other sections if account is selected
        if (data.selectedAccountId) {
          container.find('.x-events-section, .x-templates-section, .x-test-section, .btn-save-x-settings').show();
        }
      } else {
        container.find('.x-accounts-list').html('<p class="text-muted">[[x-notification:settings.no-accounts]]</p>');
      }
      
      // Update events
      if (data.events) {
        Object.keys(data.events).forEach(event => {
          container.find(`.x-event-toggle[name="${event}"]`).prop('checked', data.events[event]);
        });
      }
      
      // Update templates
      if (data.templates) {
        Object.keys(data.templates).forEach(template => {
          container.find(`.x-template[name="${template}"]`).val(data.templates[template]);
        });
      }
    });
  }
  
  function connectXAccount(cid) {
    $.post(`/api/community/${cid}/x-connect`, function(data) {
      if (data.authUrl) {
        // Open OAuth popup
        const popup = window.open(data.authUrl, 'x-auth', 'width=600,height=700');
        
        // Listen for completion
        window.addEventListener('message', function handler(event) {
          if (event.data.type === 'x-auth-success') {
            popup.close();
            window.removeEventListener('message', handler);
            
            app.alert({
              type: 'success',
              message: `[[x-notification:settings.connected-success, ${event.data.screenName}]]`
            });
            
            // Reload settings
            loadXSettings(cid);
          }
        });
      }
    });
  }
  
  function disconnectXAccount(cid, accountId) {
    bootbox.confirm('[[x-notification:settings.disconnect-confirm]]', function(result) {
      if (result) {
        $.ajax({
          url: `/api/community/${cid}/x-account/${accountId}`,
          method: 'DELETE',
          success: function() {
            app.alert({
              type: 'success',
              message: '[[x-notification:settings.disconnected]]'
            });
            loadXSettings(cid);
          }
        });
      }
    });
  }
  
  function saveXSettings(cid) {
    const container = $(`.x-notification-container[data-cid="${cid}"]`);
    
    const settings = {
      selectedAccountId: container.find('.x-account-select').val(),
      events: {},
      templates: {}
    };
    
    // Collect events
    container.find('.x-event-toggle').each(function() {
      settings.events[$(this).attr('name')] = $(this).is(':checked');
    });
    
    // Collect templates
    container.find('.x-template').each(function() {
      settings.templates[$(this).attr('name')] = $(this).val();
    });
    
    $.post(`/api/community/${cid}/x-settings`, settings, function() {
      app.alert({
        type: 'success',
        message: '[[x-notification:settings.saved]]'
      });
    });
  }
  
  function sendTestPost(cid) {
    const container = $(`.x-notification-container[data-cid="${cid}"]`);
    const message = container.find('.x-test-message').val();
    
    if (!message) {
      app.alert({
        type: 'warning',
        message: '[[x-notification:settings.test-message-required]]'
      });
      return;
    }
    
    $.post(`/api/community/${cid}/x-test`, { message }, function(data) {
      if (data.success) {
        app.alert({
          type: 'success',
          message: '[[x-notification:settings.test-success]]'
        });
        container.find('.x-test-message').val('');
      }
    }).fail(function(err) {
      app.alert({
        type: 'danger',
        message: err.responseJSON ? err.responseJSON.error : '[[x-notification:error.test-failed]]'
      });
    });
  }
})();