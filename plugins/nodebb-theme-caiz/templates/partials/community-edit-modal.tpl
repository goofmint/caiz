<div class="modal fade community-edit-modal" id="community-edit-modal" tabindex="-1" aria-labelledby="community-edit-modal-label" aria-hidden="true">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="community-edit-modal-label">Edit Community</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-0">
        <div class="row g-0 h-100">
          <!-- Left Sidebar (30%) -->
          <div class="col-md-4 sidebar-menu border-end">
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
          <div class="col-md-8 content-area">
            <div class="tab-content p-4">
              <div class="tab-pane fade show active" id="general-tab">
                <h6 class="mb-3">Edit Community Information</h6>
                <p class="text-muted">Edit basic community information including name, slug, description, and logo.</p>
                <div class="alert alert-info">
                  <i class="fa fa-info-circle me-2"></i>
                  This form will be dynamically loaded when the modal opens.
                </div>
                <!-- Danger zone will be added here dynamically -->
              </div>
              <div class="tab-pane fade" id="categories-tab">
                <h6 class="mb-3">Category Management</h6>
                <p class="text-muted">This feature will be implemented in future tasks.</p>
                <div class="alert alert-info">
                  <i class="fa fa-info-circle me-2"></i>
                  Functionality for adding, editing, and deleting subcategories within the community will be added here.
                </div>
              </div>
              <div class="tab-pane fade" id="members-tab">
                <h6 class="mb-3">Member Management</h6>
                <p class="text-muted">This feature will be implemented in future tasks.</p>
                <div class="alert alert-info">
                  <i class="fa fa-info-circle me-2"></i>
                  Member role management functionality (Owner, Manager, Member, Ban) will be added here.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>