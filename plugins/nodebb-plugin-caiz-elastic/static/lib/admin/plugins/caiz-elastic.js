define('admin/plugins/caiz-elastic', ['alerts'], function (alerts) {
  const Admin = {};

  Admin.init = function () {
    // Load settings
    socket.emit('admin.plugins.caiz-elastic.getSettings', function (err, settings) {
      if (err) {
        return alerts.error(err.message || 'Failed to load settings');
      }
      document.getElementById('elastic-node').value = settings && settings.node ? settings.node : '';
      document.getElementById('elastic-index').value = settings && settings.index ? settings.index : '';
      document.getElementById('caiz-elastic-status').textContent = settings && settings.ready ? 'Connected' : 'Not configured';
    });

    const form = document.getElementById('caiz-elastic-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const node = (document.getElementById('elastic-node').value || '').trim();
      const index = (document.getElementById('elastic-index').value || '').trim();
      if (!node || !index) {
        return alerts.error('Both node and index are required');
      }
      socket.emit('admin.plugins.caiz-elastic.saveSettings', { node, index }, function (err, result) {
        if (err) {
          return alerts.error(err.message || 'Failed to save settings');
        }
        alerts.success('Saved');
        document.getElementById('caiz-elastic-status').textContent = result && result.ready ? 'Connected' : 'Not configured';
      });
    });
  };

  return Admin;
});

