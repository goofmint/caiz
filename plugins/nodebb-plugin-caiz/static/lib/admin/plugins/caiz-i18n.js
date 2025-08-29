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

    // Community list + retranslate actions
    const refreshBtn = document.getElementById('caiz-i18n-refresh');
    const selectAllBtn = document.getElementById('caiz-i18n-select-all');
    const retranslateBtn = document.getElementById('caiz-i18n-retranslate');
    const checkAll = document.getElementById('caiz-i18n-check-all');
    const tbody = document.getElementById('caiz-i18n-tbody');
    const loading = document.getElementById('caiz-i18n-loading');

    function setLoading(v) { if (loading) loading.style.display = v ? '' : 'none'; }

    async function loadCommunities() {
      if (!tbody) return;
      setLoading(true);
      tbody.innerHTML = '';
      socket.emit('admin.plugins.caiz.listCommunities', function (err, rows) {
        setLoading(false);
        if (err) {
          return alerts.error(err.message || 'Failed to load');
        }
        (rows || []).forEach((row) => {
          const tr = document.createElement('tr');
          tr.innerHTML = [
            `<td><input type="checkbox" class="caiz-i18n-row-check" data-cid="${row.cid}"></td>`,
            `<td>${row.cid}</td>`,
            `<td>${row.name || ''}</td>`,
            `<td>${row.handle || ''}</td>`,
            `<td class="caiz-i18n-status" data-cid="${row.cid}"></td>`
          ].join('');
          tbody.appendChild(tr);
        });
      });
    }

    function getSelectedCids() {
      return Array.from(document.querySelectorAll('.caiz-i18n-row-check:checked')).map(el => parseInt(el.getAttribute('data-cid'), 10)).filter(Boolean);
    }

    function setStatus(cid, text, ok) {
      const el = document.querySelector(`.caiz-i18n-status[data-cid="${cid}"]`);
      if (el) {
        el.textContent = text;
        el.className = 'caiz-i18n-status ' + (ok ? 'text-success' : 'text-danger');
      }
    }

    if (refreshBtn) refreshBtn.addEventListener('click', function (e) { e.preventDefault(); loadCommunities(); });
    if (checkAll) checkAll.addEventListener('change', function () {
      const v = !!checkAll.checked;
      document.querySelectorAll('.caiz-i18n-row-check').forEach(cb => { cb.checked = v; });
    });
    if (selectAllBtn) selectAllBtn.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.caiz-i18n-row-check').forEach(cb => { cb.checked = true; });
    });
    if (retranslateBtn) retranslateBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const cids = getSelectedCids();
      if (!cids.length) return alerts.warning('No communities selected');
      retranslateBtn.disabled = true;
      socket.emit('admin.plugins.caiz.retranslateCommunities', { cids }, function (err, result) {
        retranslateBtn.disabled = false;
        if (err) {
          return alerts.error(err.message || 'Failed to start re-translation');
        }
        (result && result.items || []).forEach(item => {
          setStatus(item.cid, item.ok ? '[[caiz:admin.i18n.done]]' : (item.error || '[[caiz:admin.i18n.failed]]'), !!item.ok);
        });
        alerts.success('Completed');
      });
    });

    // initial load
    loadCommunities();
  };

  return I18nAdmin;
});
