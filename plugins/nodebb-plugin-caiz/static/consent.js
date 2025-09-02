'use strict';

(function () {
  const CaizConsent = {};

  function getSocket() {
    if (!window || !window.socket) {
      throw new Error('[[error:socket-not-enabled]]');
    }
    return window.socket;
  }

  function openModal() {
    let modal = document.getElementById('community-consent-modal');
    // modal markup is provided by theme partial (no HTML strings in JS)
    if (!modal) {
      throw new Error('[[caiz:error.generic]]');
    }
    return modal;
  }

  CaizConsent.requestConsentThen = function (cid, next) {
    const socket = getSocket();
    const locale = (window.config && window.config.userLang) || (window.app && app.user && app.user.userLang) || '';
    socket.emit('plugins.caiz.getConsentRule', { cid, locale }, function (err, rule) {
      if (err) {
        console.error('[caiz] getConsentRule error:', err);
        if (app && app.alertError) app.alertError(err.message || 'Error');
        return;
      }
      if (!rule) {
        if (app && app.alertError) app.alertError('[[caiz:error.consent.rule-not-found]]');
        return;
      }
      const modal = openModal();
      const versionBadge = modal.querySelector('#community-consent-version-badge');
      const content = modal.querySelector('#community-consent-markdown');
      const checkbox = modal.querySelector('#community-consent-checkbox');
      const agreeBtn = modal.querySelector('#community-consent-agree');

      versionBadge.textContent = rule.version;
      // Display raw markdown (no client Markdown dependency)
      content.textContent = rule.markdown;
      checkbox.checked = false;
      agreeBtn.disabled = true;

      checkbox.addEventListener('change', function () {
        agreeBtn.disabled = !checkbox.checked;
      }, { once: false });

      agreeBtn.onclick = function () {
        agreeBtn.disabled = true;
        socket.emit('plugins.caiz.setUserConsent', { cid, version: rule.version }, function (err) {
          if (err) {
            console.error('[caiz] setUserConsent error:', err);
            if (app && app.alertError) app.alertError(err.message || 'Error');
            agreeBtn.disabled = false;
            return;
          }
          // Close modal
          if (typeof $ !== 'undefined') {
            $('#community-consent-modal').modal('hide');
          } else {
            const closeBtn = modal.querySelector('[data-bs-dismiss="modal"]');
            closeBtn && closeBtn.click();
          }
          // Proceed to next action
          if (typeof next === 'function') next();
        });
      };

      // Translate modal text content
      try {
        require(['translator'], function (translator) {
          translator.translate(modal);
        });
      } catch (e) {
        // ignore translation errors
      }

      if (typeof $ !== 'undefined' && $.fn.modal) {
        $('#community-consent-modal').modal('show');
      } else {
        // Bootstrap 5 API
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
      }
    });
  };

  window.CaizConsent = CaizConsent;
})();
