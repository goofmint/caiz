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
    if (form) form.addEventListener('submit', function (e) {
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

    // Reindex controls
    const reindexBtn = document.getElementById('caiz-elastic-reindex');
    const scopeSel = document.getElementById('caiz-elastic-reindex-scope');
    const logEl = document.getElementById('caiz-elastic-reindex-log');
    if (reindexBtn) {
      reindexBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const scope = scopeSel ? scopeSel.value : 'all';
        reindexBtn.disabled = true;
        if (logEl) logEl.textContent = '';
        socket.emit('admin.plugins.caiz-elastic.reindex', { scope }, function (err, result) {
          reindexBtn.disabled = false;
          if (err) {
            return alerts.error(err.message || 'Failed to start reindex');
          }
          const text = JSON.stringify(result || {}, null, 2);
          if (logEl) logEl.textContent = text;
          alerts.success('Reindex completed');
        });
      });

      // Live progress log
      socket.on('admin.plugins.caiz-elastic.reindex.progress', function (payload) {
        if (!logEl) return;
        const line = `[${payload.stage}] ${payload.message || ''} ${payload.progress ? JSON.stringify(payload.progress) : ''}`.trim();
        logEl.textContent += (logEl.textContent ? '\n' : '') + line;
        logEl.scrollTop = logEl.scrollHeight;
      });
    }
  };

  return Admin;
});
