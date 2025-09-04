'use strict';

define('admin/plugins/x-notification', ['settings'], function(Settings) {
  const ACP = {};
  
  ACP.init = function() {
    Settings.load('x-notification', $('.x-notification-settings'));
    
    $('#save').on('click', function() {
      const data = {
        clientKey: $('#clientKey').val(),
        clientSecret: $('#clientSecret').val()
      };
      
      if (!data.clientKey || !data.clientSecret) {
        app.alert({
          type: 'danger',
          alert_id: 'x-notification-save-error',
          title: '[[x-notification:error]]',
          message: '[[x-notification:admin.keys-required]]'
        });
        return;
      }
      
      Settings.save('x-notification', $('.x-notification-settings'), function() {
        app.alert({
          type: 'success',
          alert_id: 'x-notification-saved',
          title: '[[x-notification:success]]',
          message: '[[x-notification:admin.settings-saved]]'
        });
      });
    });
  };
  
  return ACP;
});