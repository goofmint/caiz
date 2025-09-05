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
        <i class="fa fa-twitter"></i> [[caiz:x-notifications]]
      </a></li>
    `);
    
    // Load and add tab content template
    require(['benchpress'], function(Benchpress) {
      Benchpress.render('partials/x-notification-tab', { cid: cid }).then(function(html) {
        tabContent.append(html);
        
        // Initialize after template is rendered
        loadXSettings(cid);
        bindEvents(modal, cid);
      });
    });
    
  });
  
  function bindEvents(modal, cid) {
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
  }
  
  function loadXSettings(cid) {
    window.socket.emit('plugins.caiz.getXNotificationSettings', { cid }, function(err, data) {
      if (err) {
        console.error('[X] Load settings error:', err);
        return;
      }
      const container = $(`.x-notification-container[data-cid="${cid}"]`);
      
      // Prepare accounts data
      const accountsData = {
        accounts: data.accounts || []
      };
      
      // Mark selected account
      if (data.selectedAccountId && accountsData.accounts.length > 0) {
        accountsData.accounts = accountsData.accounts.map(account => ({
          ...account,
          selected: account.accountId === data.selectedAccountId
        }));
      }
      
      // Render accounts list template
      require(['benchpress'], function(Benchpress) {
        Benchpress.render('partials/x-accounts-list', accountsData).then(function(html) {
          container.find('.x-accounts-list').html(html);
          
          // Show other sections if account is selected
          if (data.selectedAccountId) {
            container.find('.x-events-section, .x-templates-section, .x-test-section, .btn-save-x-settings').show();
          }
        });
      });
      
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
    window.socket.emit('plugins.caiz.getXAuthUrl', { cid }, function(err, data) {
      if (err) {
        console.error('[X] Get auth URL error:', err);
        return;
      }
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
              message: `Connected to X account @${event.data.screenName}`
            });
            
            // Reload settings
            loadXSettings(cid);
          }
        });
      }
    });
  }
  
  function disconnectXAccount(cid, accountId) {
    bootbox.confirm('[[caiz:confirm-disconnect-x-message]]', function(result) {
      if (result) {
        window.socket.emit('plugins.caiz.disconnectXAccount', { cid, accountId }, function(err, data) {
          if (err) {
            app.alert({
              type: 'danger',
              message: err.message || '[[caiz:failed-to-disconnect-from-x]]'
            });
            return;
          }
          app.alert({
            type: 'success',
            message: '[[caiz:disconnected-from-x-successfully]]'
          });
          loadXSettings(cid);
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
    
    window.socket.emit('plugins.caiz.saveXNotificationSettings', { cid, settings }, function(err, data) {
      if (err) {
        app.alert({
          type: 'danger',
          message: err.message || '[[caiz:failed-to-save-notification-settings]]'
        });
        return;
      }
      app.alert({
        type: 'success',
        message: '[[caiz:notification-settings-saved]]'
      });
    });
  }
  
  function sendTestPost(cid) {
    const container = $(`.x-notification-container[data-cid="${cid}"]`);
    const message = container.find('.x-test-message').val();
    
    if (!message) {
      app.alert({
        type: 'warning',
        message: 'Test message is required'
      });
      return;
    }
    
    window.socket.emit('plugins.caiz.testXPost', { cid, message }, function(err, data) {
      if (err) {
        app.alert({
          type: 'danger',
          message: err.message || 'Test failed'
        });
        return;
      }
      if (data.success) {
        app.alert({
          type: 'success',
          message: 'Test post sent successfully'
        });
        container.find('.x-test-message').val('');
      }
    });
  }
})();