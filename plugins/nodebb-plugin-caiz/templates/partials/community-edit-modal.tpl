<div class="modal fade community-edit-modal" id="community-edit-modal" tabindex="-1" aria-labelledby="community-edit-modal-label" aria-hidden="true">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="community-edit-modal-label">Edit Community</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-0" style="max-height: 80vh; overflow: hidden;">
        <div class="row g-0" style="height: 80vh;">
          <!-- Left Sidebar (30%) -->
          <div class="col-md-4 sidebar-menu border-end" style="height: 100%;">
            <div class="list-group list-group-flush">
              <a href="#" class="list-group-item list-group-item-action active" data-tab="general">
                <i class="fa fa-edit me-2"></i>Edit
              </a>
              <a href="#" class="list-group-item list-group-item-action" data-tab="categories">
                <i class="fa fa-folder me-2"></i>Categories
              </a>
              <a href="#" class="list-group-item list-group-item-action" data-tab="members">
                <i class="fa fa-users me-2"></i>Members
              </a>
            </div>
          </div>
          <!-- Right Content Area (70%) -->
          <div class="col-md-8 content-area" style="height: 100%; overflow-y: auto;">
            <div class="tab-content p-4" style="padding-bottom: 100px !important;">
              <div class="tab-pane fade show active" id="general-tab">
                <!-- IMPORT partials/community-edit-form.tpl -->
              </div>
              <div class="tab-pane fade" id="categories-tab">
                <h6 class="mb-3">Category Management</h6>
                <div id="categories-loading" style="display: none;">
                  <i class="fa fa-spinner fa-spin"></i> Loading categories...
                </div>
                <div id="categories-empty" style="display: none;">
                  <p class="text-muted">No categories yet.</p>
                </div>
                <div id="categories-content" style="display: none;">
                  <table class="table">
                    <tbody id="categories-table-body"></tbody>
                  </table>
                </div>
                <div id="category-form-container" style="display: none;">
                  <form id="category-form">
                    <input type="hidden" id="category-form-cid" name="cid">
                    <h5 id="category-form-title">Add Category</h5>
                    
                    <div class="mb-3">
                      <label for="category-form-name" class="form-label">Name</label>
                      <input type="text" id="category-form-name" name="name" class="form-control" placeholder="Category name" required>
                    </div>
                    
                    <div class="mb-3">
                      <label for="category-form-description" class="form-label">Description</label>
                      <textarea id="category-form-description" name="description" class="form-control" placeholder="Category description" rows="3"></textarea>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Icon & Colors</label>
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <div id="category-selected-icon" class="fa fa-folder fa-lg me-2" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"></div>
                        <label for="category-form-color" class="form-label mb-0 me-2">Text:</label>
                        <input type="color" id="category-form-color" name="color" value="#000000" class="form-control form-control-color me-2" style="width: 40px; height: 30px;">
                        <label for="category-form-bg-color" class="form-label mb-0 me-2">Background:</label>
                        <input type="color" id="category-form-bg-color" name="bgColor" value="#ffffff" class="form-control form-control-color" style="width: 40px; height: 30px;">
                      </div>
                      <button type="button" id="category-icon-select" class="btn btn-outline-secondary btn-sm">
                        <i class="fa fa-search me-1"></i>Select Icon
                      </button>
                      <input type="hidden" id="category-form-icon" name="icon" value="fa-folder">
                    </div>
                    
                    <div class="d-flex gap-2">
                      <button type="button" id="cancel-category-form" class="btn btn-outline-secondary">
                        <i class="fa fa-times me-1"></i>Cancel
                      </button>
                      <button type="submit" class="btn btn-primary">
                        <span class="category-form-btn-spinner spinner-border spinner-border-sm me-1" style="display: none;"></span>
                        <span class="category-form-btn-text">Add Category</span>
                      </button>
                    </div>
                  </form>
                </div>
                <button id="add-category-btn" class="btn btn-primary">Add Category</button>
              </div>
              <div class="tab-pane fade" id="members-tab">
                <h6 class="mb-3">Member Management</h6>
                <div id="members-loading" style="display: none;">
                  <i class="fa fa-spinner fa-spin"></i> Loading members...
                </div>
                <div id="members-empty" style="display: none;">
                  <p class="text-muted">No members yet.</p>
                </div>
                <div id="members-content" style="display: none;">
                  <div id="members-list">
                    <table class="table">
                      <tbody id="members-table-body"></tbody>
                    </table>
                  </div>
                </div>
                <div id="member-form-container" style="display: none;">
                  <form id="member-form">
                    <input type="hidden" id="member-form-uid">
                    <h5 id="member-form-title">Add Member</h5>
                    <input type="text" id="member-search" class="form-control mb-2" placeholder="Search users...">
                    <div id="user-suggestions" style="display: none;"></div>
                    <select id="member-role" class="form-select mb-2">
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button type="submit" class="btn btn-primary">
                      <span class="member-form-btn-text">Add Member</span>
                      <span class="member-form-btn-spinner spinner-border spinner-border-sm" style="display: none;"></span>
                    </button>
                    <button type="button" id="cancel-member-form" class="btn btn-secondary">Cancel</button>
                  </form>
                </div>
                <button id="add-member-btn" class="btn btn-primary">Add Member</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>