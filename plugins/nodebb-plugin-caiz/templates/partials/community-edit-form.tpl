<h6 class="mb-3">[[caiz:community.edit-info]]</h6>
<p class="text-muted">[[caiz:community.edit-description]]</p>

<form id="community-edit-form">
  <!-- Community Name -->
  <div class="mb-3">
    <label for="community-name" class="form-label">[[caiz:community.name]]</label>
    <input type="text" class="form-control" id="community-name" name="name" required>
    <div class="invalid-feedback"></div>
  </div>

  <!-- Community Description -->
  <div class="mb-3">
    <label for="community-description" class="form-label">[[caiz:community.description]]</label>
    <textarea class="form-control" id="community-description" name="description" rows="3"></textarea>
  </div>

  <!-- Logo Type Selection -->
  <div class="mb-3">
    <label class="form-label">[[caiz:community.logo-type]]</label>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="logo-type" id="logo-type-icon" value="icon" checked>
      <label class="form-check-label" for="logo-type-icon">
        [[caiz:community.use-icon]]
      </label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="logo-type" id="logo-type-image" value="image">
      <label class="form-check-label" for="logo-type-image">
        [[caiz:community.use-image]]
      </label>
    </div>
  </div>

  <!-- Icon Selection (shown by default) -->
  <div id="icon-selector-group" class="mb-3">
    <label class="form-label">[[caiz:community.icon]]</label>
    <div class="d-flex align-items-center gap-3">
      <div id="selected-icon-preview" class="d-flex align-items-center justify-content-center rounded" style="width: 60px; height: 60px; background: #f8f9fa; border: 1px solid #dee2e6;">
        <i id="selected-icon" class="fa fa-folder fa-2x"></i>
      </div>
      <div class="flex-grow-1">
        <button type="button" class="btn btn-outline-secondary" id="icon-select-btn">
          <i class="fa fa-search me-2"></i>[[caiz:community.select-icon]]
        </button>
        <input type="hidden" id="community-icon" name="icon" value="fa-folder">
      </div>
    </div>
    
    <!-- Icon Colors -->
    <div class="row mt-3">
      <div class="col-md-6">
        <label for="icon-color" class="form-label">[[caiz:community.icon-color]]</label>
        <input type="color" class="form-control form-control-color" id="icon-color" name="icon_color" value="#000000">
      </div>
      <div class="col-md-6">
        <label for="icon-bg-color" class="form-label">[[caiz:community.icon-bg-color]]</label>
        <input type="color" class="form-control form-control-color" id="icon-bg-color" name="icon_bg_color" value="#f8f9fa">
      </div>
    </div>
  </div>

  <!-- Image Upload (hidden by default) -->
  <div id="image-uploader-group" class="mb-3" style="display: none;">
    <label for="community-logo" class="form-label">[[caiz:community.logo]]</label>
    <input type="file" class="form-control" id="community-logo" name="logo" accept="image/*">
    
    <!-- Current Logo Preview -->
    <div id="current-logo-preview" class="mt-2" style="display: none;">
      <label class="form-label">[[caiz:community.current-logo]]</label>
      <div class="border rounded p-2" style="max-width: 200px;">
        <img id="current-logo-img" src="" alt="Current Logo" class="img-fluid">
      </div>
    </div>
    
    <!-- New Logo Preview -->
    <div id="new-logo-preview" class="mt-2" style="display: none;">
      <label class="form-label">[[caiz:community.new-logo]]</label>
      <div class="border rounded p-2" style="max-width: 200px;">
        <img id="new-logo-img" src="" alt="New Logo" class="img-fluid">
      </div>
    </div>
  </div>

  <!-- Submit Button -->
  <hr class="my-4" />

  <!-- Participation Consent Rule -->
  <h6 class="mb-2">[[caiz:community.consent.title]]</h6>
  <div class="mb-3">
    <label for="community-consent-version" class="form-label">[[caiz:community.consent.version]]</label>
    <input type="text" class="form-control" id="community-consent-version" name="consent_version" placeholder="1.0.0">
  </div>
  <div class="mb-3">
    <label for="community-consent-markdown" class="form-label">[[caiz:community.consent.markdown]]</label>
    <textarea class="form-control" id="community-consent-markdown" name="consent_markdown" rows="6" placeholder="# Rules\n..."></textarea>
  </div>

  <div class="d-flex justify-content-end">
    <button type="submit" class="btn btn-primary">
      <span class="btn-text">[[caiz:community.save-changes]]</span>
      <span class="btn-spinner spinner-border spinner-border-sm" style="display: none;"></span>
    </button>
  </div>
</form>
