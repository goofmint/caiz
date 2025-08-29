define('admin/plugins/caiz-i18n', ['alerts'], function (alerts) {
  const I18nAdmin = {};

  I18nAdmin.init = function () {
    // Load current status
    socket.emit('admin.plugins.caiz.getI18nSettings', function (err, data) {
      if (err) {
        return alerts.error(err.message || 'Failed to load settings');
      }
      const statusEl = document.getElementById('gemini-key-status');
      if (statusEl) {
        statusEl.textContent = data && data.hasKey ? 'Configured' : 'Not configured';
      }
    });

    const form = document.getElementById('caiz-i18n-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const apiKey = (document.getElementById('gemini-api-key') || {}).value || '';
        if (!apiKey.trim()) {
          return alerts.error('Gemini API Key is required');
        }
        socket.emit('admin.plugins.caiz.saveI18nSettings', { apiKey: apiKey.trim() }, function (err, result) {
          if (err) {
            return alerts.error(err.message || 'Failed to save');
          }
          if (result && result.success) {
            alerts.success('Saved');
            const statusEl = document.getElementById('gemini-key-status');
            if (statusEl) {
              statusEl.textContent = 'Configured';
            }
            (document.getElementById('gemini-api-key') || {}).value = '';
          }
        });
      });
    }
  };

  return I18nAdmin;
});

