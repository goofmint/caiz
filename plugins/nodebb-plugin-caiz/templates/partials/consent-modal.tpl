<div class="modal fade" id="community-consent-modal" tabindex="-1" aria-labelledby="community-consent-modal-label" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="community-consent-modal-label">[[caiz:consent.title]]</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p class="text-muted">[[caiz:consent.description]]</p>
        <div class="mb-2"><span class="badge text-bg-secondary" id="community-consent-version-badge"></span></div>
        <div id="community-consent-markdown" class="border rounded p-3" style="max-height: 50vh; overflow:auto; white-space: pre-wrap; font-family: var(--bs-font-monospace);"></div>
        <div class="form-check mt-3">
          <input class="form-check-input" type="checkbox" id="community-consent-checkbox">
          <label class="form-check-label" for="community-consent-checkbox">[[caiz:consent.checkbox]]</label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">[[global:buttons.close]]</button>
        <button type="button" id="community-consent-agree" class="btn btn-primary" disabled>[[caiz:consent.agree]]</button>
      </div>
    </div>
  </div>
</div>

