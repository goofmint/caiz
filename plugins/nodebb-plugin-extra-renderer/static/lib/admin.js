'use strict';

define('admin/plugins/extra-renderer', ['settings'], function(Settings) {
  var ACP = {};

  ACP.init = function() {
    Settings.load('extra-renderer', $('.extra-renderer-settings'));

    $('#save').on('click', function() {
      Settings.save('extra-renderer', $('.extra-renderer-settings'), function() {
        app.alert({
          type: 'success',
          alert_id: 'extra-renderer-saved',
          title: 'Settings Saved',
          message: 'Extra Renderer settings have been saved successfully',
          clickfn: function() {
            socket.emit('admin.reload');
          }
        });
      });
    });
  };

  return ACP;
});