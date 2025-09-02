'use strict';

(function () {
  function installInterceptor(alerts) {
    if (!alerts || alerts.__caizConsentPatched) return;
    const origError = alerts.error;
    alerts.error = function (message, timeout) {
      try {
        const msg = (message && message.message) ? message.message : String(message || '');
        if (msg.indexOf('[[caiz:error.consent.required]]') !== -1 && window && window.CaizConsent && window.ajaxify && ajaxify.data && ajaxify.data.cid) {
          const cid = ajaxify.data.cid;
          // Prompt consent modal, then reload to resume UX
          window.CaizConsent.requestConsentThen(cid, function () { window.location.reload(); });
          return; // Skip default alert
        }
      } catch (e) {
        // fall through to original alert on interceptor failure
      }
      return origError.apply(alerts, arguments);
    };
    alerts.__caizConsentPatched = true;
  }

  // Try immediate install if alerts already loaded
  if (typeof alerts !== 'undefined') {
    installInterceptor(alerts);
  } else if (typeof require !== 'undefined') {
    try {
      require(['alerts'], function (alerts) { installInterceptor(alerts); });
    } catch (e) {}
  }
})();

