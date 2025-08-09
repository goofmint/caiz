// Community Edit Button Management

const addEditButton = (cid) => {
  console.log('[caiz] Adding edit button for community', cid);
  
  // Check if button already exists
  if (document.querySelector('.community-edit-btn')) {
    console.log('[caiz] Edit button already exists');
    return;
  }
  
  const editBtn = $('<button>')
    .addClass('btn btn-link p-0 community-edit-btn')
    .attr('data-cid', cid)
    .attr('title', 'Edit Community')
    .html('<i class="fa fa-cog fa-lg text-muted"></i>')
    .css({
      'background': 'none',
      'border': 'none',
      'padding': '8px',
      'margin-left': '8px'
    });
  
  // Check screen size first
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // On mobile, always use fixed position with proper spacing
    $('body').append(editBtn);
    editBtn.addClass('fixed-position');
    console.log('[caiz] Edit button added as mobile FAB');
  } else {
    // On desktop, look for the follow button's container
    const followBtn = $('#community-follow-button, [data-cid]').filter('.btn').first();
    let insertLocation = null;
    
    if (followBtn.length) {
      // Get the parent container of the follow button
      const followContainer = followBtn.parent();
      
      // Add edit button to the right side of follow button
      editBtn.css({ marginLeft: '8px' });
      followContainer.append(editBtn);
      insertLocation = 'after follow button in container';
    } else {
      // Look for the right side container in category header
      const rightContainer = $('.category-header .d-flex.justify-content-between > div:last-child').first();
      if (rightContainer.length) {
        editBtn.css({ marginLeft: '8px' });
        rightContainer.append(editBtn);
        insertLocation = 'in right container';
      } else {
        // Create a new container in the header
        const headerTopRow = $('.category-header .d-flex.justify-content-between').first();
        if (headerTopRow.length) {
          let rightDiv = headerTopRow.find('> div:last-child');
          if (!rightDiv.length) {
            rightDiv = $('<div></div>');
            headerTopRow.append(rightDiv);
          }
          editBtn.css({ marginLeft: '8px' });
          rightDiv.append(editBtn);
          insertLocation = 'in created right container';
        } else {
          // Ultimate fallback
          $('body').append(editBtn);
          editBtn.addClass('fixed-position');
          insertLocation = 'fixed fallback';
        }
      }
    }
    
    console.log('[caiz] Edit button added:', insertLocation);
  }
  
  // Add hover effects
  editBtn.on('mouseenter', function() {
    $(this).find('i').removeClass('text-muted').addClass('text-primary');
  });
  
  editBtn.on('mouseleave', function() {
    $(this).find('i').removeClass('text-primary').addClass('text-muted');
  });
  
  // Add click event to open edit modal
  editBtn.on('click', function() {
    console.log('[caiz] Edit button clicked for community', cid);
    openCommunityEditModal(cid);
  });
};

const checkCommunityOwnership = async (cid) => {
  console.log('[caiz] Checking ownership for community', cid);
  
  return new Promise((resolve) => {
    socket.emit('plugins.caiz.isCommunityOwner', { cid }, function(err, result) {
      if (err) {
        console.error('[caiz] Error checking community ownership:', err);
        resolve(false);
        return;
      }
      
      console.log('[caiz] Ownership check result:', result);
      resolve(result && result.isOwner);
    });
  });
};

const initializeFollowButton = async (cid) => {
  console.log('[caiz] Initializing follow button for cid:', cid);
  
  const followButton = $('#community-follow-button');
  if (followButton.length === 0) {
    console.log('[caiz] No follow button found');
    return;
  }

  // Get translator and alert utilities
  const { alert } = await getAlert();
  const translator = await getTranslate();
  const messageKeys = [
    'caiz:follow',
    'caiz:unfollow', 
    'caiz:follow_success',
    'caiz:unfollow_success',
    'caiz:error.generic',
    'caiz:unfollowing',
    'caiz:following',
  ];
  
  const messages = Object.fromEntries(
    await Promise.all(
      messageKeys.map(key => 
        new Promise((resolve) => 
          translator.translate(`[[${key}]]`, (t) => resolve([key, t]))
        )
      )
    )
  );

  const getText = (key) => messages[key] || key;
  
  let followStatus = false;

  const changeButtonLabel = () => {
    const key = followStatus ? 'caiz:unfollow' : 'caiz:follow';
    followButton.text(getText(key));
    if (typeof updateCommunities !== 'undefined') {
      updateCommunities();
    }
  };

  // Get initial follow status
  socket.emit('plugins.caiz.isFollowed', { cid }, function (err, response) {
    if (err) {
      console.error('[caiz] Error getting follow status:', err);
      return alert({
        type: 'error',
        message: err.message || getText('caiz:error.generic'),
        timeout: 3000,
      });
    }
    
    followStatus = response.isFollowed;
    changeButtonLabel();
    console.log('[caiz] Follow status updated:', followStatus);
  });

  // Remove existing event handlers to prevent duplicates
  followButton.off('mouseenter mouseleave click');

  // Add hover effects
  followButton.on('mouseenter', () => {
    const key = followStatus ? 'caiz:unfollowing' : 'caiz:following';
    followButton.text(getText(key));
  });

  followButton.on('mouseleave', () => {
    const key = followStatus ? 'caiz:unfollow' : 'caiz:follow';
    followButton.text(getText(key));
  });

  // Add click handler
  followButton.on('click', () => {
    const action = followStatus ? 
      'plugins.caiz.unfollowCommunity' : 
      'plugins.caiz.followCommunity';
      
    socket.emit(action, { cid }, function (err, response) {
      if (err) {
        console.error('[caiz] Follow action error:', err);
        return alert({
          type: 'error',
          message: err.message || getText('caiz:error.generic'),
          timeout: 3000,
        });
      }
      
      followStatus = response.isFollowed;
      alert({
        type: 'success',
        message: getText(followStatus ? 'caiz:follow_success' : 'caiz:unfollow_success'),
        timeout: 3000,
      });
      changeButtonLabel();
      console.log('[caiz] Follow status changed to:', followStatus);
    });
  });
};

const initializeCommunityPage = async () => {
  console.log('[caiz] Initializing community page for template:', ajaxify.data.template.name);
  
  // Only run on category pages
  if (ajaxify.data.template.name !== 'category') {
    console.log('[caiz] Not a category page, skipping community features');
    return;
  }
  
  const cid = ajaxify.data.cid;
  if (!cid) {
    console.log('[caiz] No category ID found, skipping community features');
    return;
  }
  
  // Initialize follow button for all users
  if (app.user && app.user.uid) {
    await initializeFollowButton(cid);
    
    // Check if user is owner and add edit button
    console.log('[caiz] Checking ownership for category ID:', cid);
    const isOwner = await checkCommunityOwnership(cid);
    
    if (isOwner) {
      console.log('[caiz] User is owner, adding edit button');
      addEditButton(cid);
    } else {
      console.log('[caiz] User is not owner, no edit button');
    }
  } else {
    console.log('[caiz] User not logged in, skipping community features');
  }
};

// Initialize on page load
$(window).on('action:ajaxify.end', function(event, data) {
  // Small delay to ensure DOM is ready
  setTimeout(initializeCommunityPage, 100);
});

// Initialize on initial page load
$(document).ready(function() {
  if (typeof ajaxify !== 'undefined') {
    setTimeout(initializeCommunityPage, 100);
  }
  
  // Initialize modal navigation after DOM is ready
  setTimeout(initializeModalNavigation, 200);
});

// Modal Management Functions
const openCommunityEditModal = async (cid) => {
  console.log('[caiz] Opening edit modal for community', cid);
  
  try {
    // Use NodeBB's bootbox for modal if available
    if (typeof bootbox !== 'undefined') {
      console.log('[caiz] Using NodeBB bootbox modal');
      await openBootboxModal(cid);
    } else {
      console.log('[caiz] Bootbox not available, using custom modal');
      await openCustomModal(cid);
    }
  } catch (error) {
    console.error('[caiz] Error opening modal:', error);
    // Fallback to simple modal
    await openCustomModal(cid);
  }
};

const openBootboxModal = async (cid) => {
  const modalHtml = await getModalHtml(cid);
  
  const modal = bootbox.dialog({
    title: 'Edit Community',
    message: modalHtml,
    size: 'extra-large',
    backdrop: true,
    onEscape: true,
    buttons: {
      close: {
        label: 'Close',
        className: 'btn-secondary',
        callback: function () {
          console.log('[caiz] Modal closed via button');
        }
      }
    }
  });
  
  // Initialize navigation and form after modal is shown
  modal.on('shown.bs.modal', function () {
    initializeModalNavigation();
    resetModalToFirstTab();
    initializeCommunityEditForm(cid);
  });
  
  console.log('[caiz] Bootbox modal opened for cid:', cid);
};

const openCustomModal = async (cid) => {
  // Ensure modal template is loaded
  await ensureModalTemplate();
  
  const modalElement = document.getElementById('community-edit-modal');
  
  if (!modalElement) {
    console.error('[caiz] Modal element not found');
    return;
  }
  
  // Reset to first tab
  resetModalToFirstTab();
  
  // Store current community ID for later use
  modalElement.setAttribute('data-cid', cid);
  
  // Use jQuery/Bootstrap modal if available
  if (typeof $ !== 'undefined' && $.fn.modal) {
    console.log('[caiz] Using jQuery modal');
    $(modalElement).modal('show');
    
    // Handle modal close events
    $(modalElement).on('hidden.bs.modal', function () {
      console.log('[caiz] Modal closed via jQuery');
    });
  } else {
    console.log('[caiz] Using manual modal display');
    // Manual modal display
    modalElement.style.display = 'block';
    modalElement.classList.add('show');
    modalElement.setAttribute('aria-hidden', 'false');
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'community-edit-modal-backdrop';
    document.body.appendChild(backdrop);
    
    // Add body class for modal-open state
    document.body.classList.add('modal-open');
    
    // Handle close events
    setupModalCloseHandlers(modalElement, backdrop);
  }
  
  // Initialize form after modal display
  setTimeout(() => initializeCommunityEditForm(cid), 200);
  
  console.log('[caiz] Custom modal opened for cid:', cid);
};

const setupModalCloseHandlers = (modalElement, backdrop) => {
  const closeHandler = () => {
    closeCommunityEditModal();
  };
  
  // Close button
  const closeBtn = modalElement.querySelector('.btn-close, [data-bs-dismiss="modal"]');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeHandler);
  }
  
  // Backdrop click
  if (backdrop) {
    backdrop.addEventListener('click', closeHandler);
  }
  
  // ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeHandler();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
};

const closeCommunityEditModal = () => {
  console.log('[caiz] Closing community edit modal');
  
  const modalElement = document.getElementById('community-edit-modal');
  const backdrop = document.getElementById('community-edit-modal-backdrop');
  
  if (modalElement) {
    modalElement.style.display = 'none';
    modalElement.classList.remove('show');
    modalElement.setAttribute('aria-hidden', 'true');
  }
  
  if (backdrop) {
    backdrop.remove();
  }
  
  document.body.classList.remove('modal-open');
};

const getModalHtml = async (cid) => {
  return `
    <div class="row g-0 h-100" style="min-height: 60vh;">
      <!-- Left Sidebar (30%) -->
      <div class="col-md-4 sidebar-menu border-end" style="background-color: #f8f9fa; min-height: 100%;">
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
      <div class="col-md-8 content-area" style="min-height: 100%; background-color: #ffffff;">
        <div class="tab-content p-4">
          <div class="tab-pane fade show active" id="general-tab">
            <h6 class="mb-3">Edit Community Information</h6>
            
            <form id="community-edit-form">
              <div class="mb-3">
                <label for="community-name" class="form-label">Community Name *</label>
                <input type="text" class="form-control" id="community-name" name="name" required>
                <div class="invalid-feedback"></div>
              </div>
              
              <div class="mb-3">
                <label for="community-description" class="form-label">Description</label>
                <textarea class="form-control" id="community-description" name="description" rows="4"></textarea>
                <div class="invalid-feedback"></div>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Community Icon/Logo</label>
                
                <!-- Toggle between icon and image -->
                <div class="btn-group mb-2 d-block" role="group">
                  <input type="radio" class="btn-check" name="logo-type" id="logo-type-icon" value="icon" autocomplete="off" checked>
                  <label class="btn btn-outline-primary" for="logo-type-icon">
                    <i class="fa fa-icons me-1"></i>Icon
                  </label>
                  
                  <input type="radio" class="btn-check" name="logo-type" id="logo-type-image" value="image" autocomplete="off">
                  <label class="btn btn-outline-primary" for="logo-type-image">
                    <i class="fa fa-image me-1"></i>Image
                  </label>
                </div>
                
                <!-- Icon selector -->
                <div id="icon-selector-group" style="display: block;">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <button type="button" class="btn btn-secondary" id="icon-select-btn">
                      <i class="fa fa-icons me-1"></i>Select Icon
                    </button>
                    <div id="selected-icon-preview" class="d-inline-flex align-items-center" style="padding: 10px; border-radius: 8px; background: #f8f9fa;">
                      <i id="selected-icon" class="fa fa-users fa-2x"></i>
                      <input type="hidden" id="community-icon" name="icon" value="fa-users">
                    </div>
                  </div>
                  
                  <!-- Icon color picker -->
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <label for="icon-color" class="form-label mb-0">Icon Color:</label>
                    <input type="color" class="form-control form-control-color" id="icon-color" name="iconColor" value="#000000" style="width: 60px;">
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="reset-icon-color">
                      <i class="fa fa-undo"></i> Reset
                    </button>
                  </div>
                  
                  <!-- Background color picker -->
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <label for="icon-bg-color" class="form-label mb-0">Background Color:</label>
                    <input type="color" class="form-control form-control-color" id="icon-bg-color" name="bgColor" value="#f8f9fa" style="width: 60px;">
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="reset-bg-color">
                      <i class="fa fa-undo"></i> Reset
                    </button>
                  </div>
                  
                  <div class="form-text">Select an icon and customize its colors</div>
                </div>
                
                <!-- Image uploader -->
                <div id="image-uploader-group" style="display: none;">
                  <input type="file" class="form-control" id="community-logo" name="logoFile" accept="image/*">
                  <div class="form-text">Select an image file for the community logo</div>
                  <div class="invalid-feedback"></div>
                  <div class="mt-2" id="current-logo-preview" style="display: none;">
                    <small class="text-muted">Current logo:</small>
                    <br>
                    <img id="current-logo-img" src="" alt="Current logo" style="max-width: 100px; max-height: 100px; border-radius: 4px;">
                  </div>
                  <div class="mt-2" id="new-logo-preview" style="display: none;">
                    <small class="text-muted">New logo preview:</small>
                    <br>
                    <img id="new-logo-img" src="" alt="New logo preview" style="max-width: 100px; max-height: 100px; border-radius: 4px;">
                  </div>
                </div>
              </div>
              
              <div class="d-flex justify-content-end">
                <button type="submit" class="btn btn-primary">
                  <span class="btn-text">Save Changes</span>
                  <span class="btn-spinner" style="display: none;">
                    <i class="fa fa-spinner fa-spin"></i> Saving...
                  </span>
                </button>
              </div>
            </form>
          </div>
          <div class="tab-pane fade" id="categories-tab">
            <h6 class="mb-3">Category Management</h6>
            
            <!-- Add Category Button -->
            <div class="d-flex justify-content-between align-items-center mb-3">
              <p class="text-muted mb-0">Manage subcategories within this community</p>
              <button type="button" class="btn btn-primary btn-sm" id="add-category-btn">
                <i class="fa fa-plus me-1"></i>Add Category
              </button>
            </div>
            
            <!-- Categories List -->
            <div id="categories-list">
              <div class="text-center py-4" id="categories-loading">
                <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
                <p class="text-muted mt-2">Loading categories...</p>
              </div>
              
              <div id="categories-empty" style="display: none;">
                <div class="text-center py-4">
                  <i class="fa fa-folder-open fa-3x text-muted mb-3"></i>
                  <p class="text-muted">No categories found. Click "Add Category" to create your first one.</p>
                </div>
              </div>
              
              <div id="categories-content" style="display: none;">
                <div class="table-responsive">
                  <table class="table table-hover">
                    <thead>
                      <tr>
                        <th style="width: 40px;"><i class="fa fa-arrows-v text-muted"></i></th>
                        <th>Name</th>
                        <th>Description</th>
                        <th class="text-center" style="width: 80px;">Topics</th>
                        <th class="text-center" style="width: 80px;">Posts</th>
                        <th class="text-end" style="width: 120px;">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="categories-table-body">
                      <!-- Categories will be populated here -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <!-- Category Form Modal (inline for now) -->
            <div id="category-form-container" style="display: none;" class="mt-4">
              <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h6 class="mb-0" id="category-form-title">Add Category</h6>
                  <button type="button" class="btn-close" id="cancel-category-form"></button>
                </div>
                <div class="card-body">
                  <form id="category-form">
                    <input type="hidden" id="category-form-cid" name="cid">
                    
                    <div class="mb-3">
                      <label for="category-form-name" class="form-label">Category Name *</label>
                      <input type="text" class="form-control" id="category-form-name" name="name" required maxlength="50">
                      <div class="invalid-feedback"></div>
                    </div>
                    
                    <div class="mb-3">
                      <label for="category-form-description" class="form-label">Description</label>
                      <textarea class="form-control" id="category-form-description" name="description" rows="3" maxlength="255"></textarea>
                      <div class="form-text">Optional description for this category</div>
                    </div>
                    
                    <div class="row">
                      <div class="col-md-4">
                        <div class="mb-3">
                          <label class="form-label">Icon</label>
                          <div class="d-flex align-items-center gap-2">
                            <button type="button" class="btn btn-outline-secondary btn-sm" id="category-icon-select">
                              <i class="fa fa-icons"></i>
                            </button>
                            <div class="d-inline-flex align-items-center">
                              <i id="category-selected-icon" class="fa fa-folder fa-lg"></i>
                              <input type="hidden" id="category-form-icon" name="icon" value="fa-folder">
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="col-md-4">
                        <div class="mb-3">
                          <label for="category-form-color" class="form-label">Icon Color</label>
                          <input type="color" class="form-control form-control-color" id="category-form-color" name="color" value="#000000">
                        </div>
                      </div>
                      
                      <div class="col-md-4">
                        <div class="mb-3">
                          <label for="category-form-bg-color" class="form-label">Background Color</label>
                          <input type="color" class="form-control form-control-color" id="category-form-bg-color" name="bgColor" value="#ffffff">
                        </div>
                      </div>
                    </div>
                    
                    <div class="d-flex justify-content-end gap-2">
                      <button type="button" class="btn btn-secondary" id="cancel-category-form-btn">Cancel</button>
                      <button type="submit" class="btn btn-primary">
                        <span class="category-form-btn-text">Add Category</span>
                        <span class="category-form-btn-spinner" style="display: none;">
                          <i class="fa fa-spinner fa-spin"></i> Saving...
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div class="tab-pane fade" id="members-tab">
            <h6 class="mb-3">Member Management</h6>
            
            <!-- Add Member Button and Search -->
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="input-group" style="width: 250px;">
                <span class="input-group-text"><i class="fa fa-search"></i></span>
                <input type="text" class="form-control" id="member-search" placeholder="Search members...">
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="add-member-btn">
                <i class="fa fa-plus me-1"></i>Add Member
              </button>
            </div>
            
            <!-- Members List -->
            <div id="members-list">
              <div class="text-center py-4" id="members-loading">
                <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
                <p class="text-muted mt-2">Loading members...</p>
              </div>
              
              <div id="members-empty" style="display: none;">
                <div class="text-center py-4">
                  <i class="fa fa-users fa-3x text-muted mb-3"></i>
                  <p class="text-muted">No members found. Click "Add Member" to invite your first member.</p>
                </div>
              </div>
              
              <div id="members-content" style="display: none;">
                <div class="table-responsive">
                  <table class="table table-hover">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Last Online</th>
                        <th class="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="members-table-body">
                      <!-- Members will be populated here -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <!-- Add Member Form (inline) -->
            <div id="add-member-form-container" style="display: none;" class="mt-4">
              <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h6 class="mb-0">Add Member</h6>
                  <button type="button" class="btn-close" id="cancel-add-member"></button>
                </div>
                <div class="card-body">
                  <form id="add-member-form">
                    <div class="mb-3">
                      <label for="add-member-username" class="form-label">Username *</label>
                      <input type="text" class="form-control" id="add-member-username" name="username" required maxlength="50" placeholder="Enter username">
                      <div class="invalid-feedback"></div>
                      <div class="form-text">Enter the exact username of the user you want to add</div>
                    </div>
                    
                    <div class="d-flex justify-content-end gap-2">
                      <button type="button" class="btn btn-secondary" id="cancel-add-member-btn">Cancel</button>
                      <button type="submit" class="btn btn-primary">
                        <span class="add-member-btn-text">Add Member</span>
                        <span class="add-member-btn-spinner" style="display: none;">
                          <i class="fa fa-spinner fa-spin"></i> Adding...
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

function resetModalToFirstTab() {
  console.log('[caiz] Resetting modal to first tab');
  
  // Reset sidebar menu
  document.querySelectorAll('.sidebar-menu .list-group-item').forEach(item => {
    item.classList.remove('active');
  });
  const firstItem = document.querySelector('.sidebar-menu .list-group-item[data-tab="general"]');
  if (firstItem) {
    firstItem.classList.add('active');
  }
  
  // Reset content tabs
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active', 'show');
  });
  const firstTab = document.getElementById('general-tab');
  if (firstTab) {
    firstTab.classList.add('active', 'show');
  }
}

function initializeModalNavigation() {
  console.log('[caiz] Initializing modal navigation');
  
  // Remove existing event listeners to prevent duplicates
  document.querySelectorAll('.sidebar-menu .list-group-item').forEach(item => {
    const newItem = item.cloneNode(true);
    item.parentNode.replaceChild(newItem, item);
  });
  
  // Add event listeners to sidebar menu items
  document.querySelectorAll('.sidebar-menu .list-group-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      
      console.log('[caiz] Sidebar menu item clicked:', this.getAttribute('data-tab'));
      
      // Update sidebar active state
      document.querySelectorAll('.sidebar-menu .list-group-item').forEach(i => {
        i.classList.remove('active');
      });
      this.classList.add('active');
      
      // Update content area
      const tabName = this.getAttribute('data-tab');
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active', 'show');
      });
      
      const targetTab = document.getElementById(tabName + '-tab');
      if (targetTab) {
        targetTab.classList.add('active', 'show');
      }
      
      console.log('[caiz] Switched to tab:', tabName);
    });
  });
}

const ensureModalTemplate = async () => {
  console.log('[caiz] Ensuring modal template is loaded');
  
  // Check if modal already exists
  if (document.getElementById('community-edit-modal')) {
    console.log('[caiz] Modal template already loaded');
    return;
  }
  
  try {
    // Try to fetch and inject the modal template
    const response = await fetch('/plugins/nodebb-plugin-caiz/templates/partials/community-edit-modal.tpl');
    
    if (response.ok) {
      const templateHtml = await response.text();
      
      // Create a temporary element to parse the template
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = templateHtml;
      
      // Append to body
      document.body.appendChild(tempDiv.firstElementChild);
      
      // Re-initialize navigation after template is loaded
      setTimeout(initializeModalNavigation, 100);
      
      console.log('[caiz] Modal template loaded successfully');
    } else {
      console.error('[caiz] Failed to load modal template:', response.status);
      // Fallback: inject modal HTML directly
      injectModalTemplate();
    }
  } catch (error) {
    console.error('[caiz] Error loading modal template:', error);
    // Fallback: inject modal HTML directly
    injectModalTemplate();
  }
};

const injectModalTemplate = () => {
  console.log('[caiz] Injecting modal template directly');
  
  const modalHtml = `
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
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Initialize navigation after template is injected
  setTimeout(initializeModalNavigation, 100);
};

// Utility function to decode HTML entities
const decodeHTMLEntities = (text) => {
  if (!text) return text;
  
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// Setup logo type toggle (icon vs image)
const setupLogoTypeToggle = () => {
  const iconRadio = document.getElementById('logo-type-icon');
  const imageRadio = document.getElementById('logo-type-image');
  const iconGroup = document.getElementById('icon-selector-group');
  const imageGroup = document.getElementById('image-uploader-group');
  
  if (!iconRadio || !imageRadio || !iconGroup || !imageGroup) {
    console.error('[caiz] Logo type toggle elements not found');
    return;
  }
  
  iconRadio.addEventListener('change', () => {
    if (iconRadio.checked) {
      iconGroup.style.display = 'block';
      imageGroup.style.display = 'none';
      console.log('[caiz] Switched to icon mode');
    }
  });
  
  imageRadio.addEventListener('change', () => {
    if (imageRadio.checked) {
      iconGroup.style.display = 'none';
      imageGroup.style.display = 'block';
      console.log('[caiz] Switched to image mode');
    }
  });
};

// Setup icon color pickers
const setupIconColorPickers = () => {
  const iconColorInput = document.getElementById('icon-color');
  const bgColorInput = document.getElementById('icon-bg-color');
  const selectedIcon = document.getElementById('selected-icon');
  const iconPreview = document.getElementById('selected-icon-preview');
  const resetIconColor = document.getElementById('reset-icon-color');
  const resetBgColor = document.getElementById('reset-bg-color');
  
  if (!iconColorInput || !bgColorInput || !selectedIcon || !iconPreview) {
    console.error('[caiz] Color picker elements not found');
    return;
  }
  
  // Icon color change
  iconColorInput.addEventListener('input', (e) => {
    selectedIcon.style.color = e.target.value;
    console.log('[caiz] Icon color changed to:', e.target.value);
  });
  
  // Background color change
  bgColorInput.addEventListener('input', (e) => {
    iconPreview.style.background = e.target.value;
    console.log('[caiz] Background color changed to:', e.target.value);
  });
  
  // Reset icon color
  if (resetIconColor) {
    resetIconColor.addEventListener('click', () => {
      iconColorInput.value = '#000000';
      selectedIcon.style.color = '#000000';
      console.log('[caiz] Icon color reset to default');
    });
  }
  
  // Reset background color
  if (resetBgColor) {
    resetBgColor.addEventListener('click', () => {
      bgColorInput.value = '#f8f9fa';
      iconPreview.style.background = '#f8f9fa';
      console.log('[caiz] Background color reset to default');
    });
  }
};

// Category Management Functions
let currentCommunityId = null;
let subcategories = [];

const initializeCategoryManagement = (cid) => {
  console.log('[caiz] Initializing category management for cid:', cid);
  currentCommunityId = cid;
  
  setupCategoryEventHandlers();
  loadSubCategories();
};

const setupCategoryEventHandlers = () => {
  // Add category button
  const addBtn = document.getElementById('add-category-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => showCategoryForm());
  }
  
  // Cancel form buttons
  const cancelBtns = document.querySelectorAll('#cancel-category-form, #cancel-category-form-btn');
  cancelBtns.forEach(btn => {
    btn.addEventListener('click', () => hideCategoryForm());
  });
  
  // Form submit
  const form = document.getElementById('category-form');
  if (form) {
    form.addEventListener('submit', handleCategoryFormSubmit);
  }
  
  // Icon selector for category form
  const iconSelectBtn = document.getElementById('category-icon-select');
  if (iconSelectBtn) {
    iconSelectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCategoryIconSelector();
    });
  }
  
  // Color change handlers
  const colorInput = document.getElementById('category-form-color');
  const bgColorInput = document.getElementById('category-form-bg-color');
  const iconElement = document.getElementById('category-selected-icon');
  
  if (colorInput && iconElement) {
    colorInput.addEventListener('input', (e) => {
      iconElement.style.color = e.target.value;
    });
  }
  
  if (bgColorInput && iconElement) {
    bgColorInput.addEventListener('input', (e) => {
      iconElement.style.backgroundColor = e.target.value;
    });
  }
};

const loadSubCategories = async () => {
  if (!currentCommunityId) return;
  
  try {
    console.log('[caiz] Loading subcategories for cid:', currentCommunityId);
    showCategoriesLoading();
    
    socket.emit('plugins.caiz.getSubCategories', { cid: currentCommunityId }, function(err, data) {
      // Always hide loading state
      const loadingEl = document.getElementById('categories-loading');
      if (loadingEl) loadingEl.style.display = 'none';
      
      if (err) {
        console.error('[caiz] Error loading subcategories:', err);
        showCategoriesError(err.message);
        return;
      }
      
      subcategories = data || [];
      console.log('[caiz] Loaded subcategories:', subcategories);
      renderSubCategories();
    });
  } catch (error) {
    console.error('[caiz] Error in loadSubCategories:', error);
    // Hide loading state on error
    const loadingEl = document.getElementById('categories-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    showCategoriesError(error.message);
  }
};

const showCategoriesLoading = () => {
  document.getElementById('categories-loading').style.display = 'block';
  document.getElementById('categories-empty').style.display = 'none';
  document.getElementById('categories-content').style.display = 'none';
};

const showCategoriesError = (message) => {
  document.getElementById('categories-loading').style.display = 'none';
  document.getElementById('categories-empty').style.display = 'none';
  document.getElementById('categories-content').style.display = 'none';
  
  // Show error message
  if (typeof alerts !== 'undefined') {
    alerts.error(`Failed to load categories: ${message}`);
  }
};

const renderSubCategories = () => {
  const loadingEl = document.getElementById('categories-loading');
  const emptyEl = document.getElementById('categories-empty');
  const contentEl = document.getElementById('categories-content');
  const tableBody = document.getElementById('categories-table-body');
  
  loadingEl.style.display = 'none';
  
  if (!subcategories.length) {
    emptyEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }
  
  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';
  
  // Render table rows
  tableBody.innerHTML = subcategories.map(category => {
    // Decode HTML entities in category name and description for display
    const decodedName = decodeHTMLEntities(category.name || '');
    const decodedDescription = decodeHTMLEntities(category.description || '');
    
    return `
      <tr data-cid="${category.cid}" draggable="true" class="category-row">
        <td>
          <i class="fa fa-grip-vertical text-muted category-drag-handle" style="cursor: move;"></i>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${category.icon ? `<i class="fa ${category.icon}" style="color: ${category.color || '#000'}; background-color: ${category.bgColor || 'transparent'};"></i>` : ''}
            <strong>${escapeHtml(decodedName)}</strong>
          </div>
        </td>
        <td>
          <small class="text-muted">${decodedDescription ? escapeHtml(decodedDescription) : '-'}</small>
        </td>
        <td class="text-center">
          <span class="badge bg-secondary">${category.topiccount || 0}</span>
        </td>
        <td class="text-center">
          <span class="badge bg-info">${category.postcount || 0}</span>
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button type="button" class="btn btn-outline-primary" onclick="editCategory(${category.cid})" title="Edit">
              <i class="fa fa-edit"></i>
            </button>
            <button type="button" class="btn btn-outline-danger" onclick="deleteCategory(${category.cid}, '${escapeHtml(decodedName)}')" title="Delete">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  // Initialize drag and drop after rendering
  initializeDragAndDrop();
};

const showCategoryForm = (category = null) => {
  const container = document.getElementById('category-form-container');
  const title = document.getElementById('category-form-title');
  const form = document.getElementById('category-form');
  const cidInput = document.getElementById('category-form-cid');
  const nameInput = document.getElementById('category-form-name');
  const descInput = document.getElementById('category-form-description');
  const iconInput = document.getElementById('category-form-icon');
  const colorInput = document.getElementById('category-form-color');
  const bgColorInput = document.getElementById('category-form-bg-color');
  const iconElement = document.getElementById('category-selected-icon');
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.category-form-btn-text');
  
  // Reset form
  form.reset();
  form.classList.remove('was-validated');
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  
  if (category) {
    // Edit mode
    title.textContent = 'Edit Category';
    btnText.textContent = 'Update Category';
    cidInput.value = category.cid;
    nameInput.value = decodeHTMLEntities(category.name || '');
    descInput.value = decodeHTMLEntities(category.description || '');
    iconInput.value = category.icon || 'fa-folder';
    colorInput.value = category.color || '#000000';
    bgColorInput.value = category.bgColor || '#ffffff';
    
    // Update icon display
    iconElement.className = `fa ${category.icon || 'fa-folder'} fa-lg`;
    iconElement.style.color = category.color || '#000000';
    iconElement.style.backgroundColor = category.bgColor || '#ffffff';
  } else {
    // Add mode
    title.textContent = 'Add Category';
    btnText.textContent = 'Add Category';
    cidInput.value = '';
    iconInput.value = 'fa-folder';
    colorInput.value = '#000000';
    bgColorInput.value = '#ffffff';
    
    // Reset icon display
    iconElement.className = 'fa fa-folder fa-lg';
    iconElement.style.color = '#000000';
    iconElement.style.backgroundColor = '#ffffff';
  }
  
  container.style.display = 'block';
  nameInput.focus();
};

const hideCategoryForm = () => {
  document.getElementById('category-form-container').style.display = 'none';
};

const handleCategoryFormSubmit = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Validate
  if (!data.name.trim()) {
    showFieldError(form.querySelector('#category-form-name'), 'Category name is required');
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.category-form-btn-text');
  const btnSpinner = submitBtn.querySelector('.category-form-btn-spinner');
  
  // Show loading
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline';
  submitBtn.disabled = true;
  
  try {
    const isEdit = !!data.cid;
    const socketEvent = isEdit ? 'plugins.caiz.updateSubCategory' : 'plugins.caiz.createSubCategory';
    const requestData = {
      parentCid: currentCommunityId,
      name: data.name.trim(),
      description: data.description.trim(),
      icon: data.icon,
      color: data.color !== '#000000' ? data.color : '',
      bgColor: data.bgColor !== '#ffffff' ? data.bgColor : ''
    };
    
    if (isEdit) {
      requestData.cid = parseInt(data.cid);
    }
    
    console.log('[caiz] Submitting category form:', requestData);
    
    socket.emit(socketEvent, requestData, function(err, result) {
      if (err) {
        console.error('[caiz] Error saving category:', err);
        if (typeof alerts !== 'undefined') {
          alerts.error(err.message || 'Failed to save category');
        }
        return;
      }
      
      console.log('[caiz] Category saved successfully:', result);
      
      if (typeof alerts !== 'undefined') {
        alerts.success(isEdit ? 'Category updated successfully' : 'Category created successfully');
      }
      
      hideCategoryForm();
      loadSubCategories(); // Reload the list
    });
    
  } catch (error) {
    console.error('[caiz] Error in form submit:', error);
    if (typeof alerts !== 'undefined') {
      alerts.error(error.message || 'An error occurred');
    }
  } finally {
    // Reset loading state
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    submitBtn.disabled = false;
  }
};

const editCategory = (cid) => {
  const category = subcategories.find(cat => cat.cid == cid);
  if (category) {
    showCategoryForm(category);
  }
};

const deleteCategory = (cid, name) => {
  const decodedName = decodeHTMLEntities(name || '');
  
  if (typeof bootbox !== 'undefined') {
    bootbox.confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${escapeHtml(decodedName)}"? This action cannot be undone.`,
      buttons: {
        confirm: {
          label: '<i class="fa fa-trash"></i> Delete',
          className: 'btn-danger'
        },
        cancel: {
          label: 'Cancel',
          className: 'btn-secondary'
        }
      },
      callback: function(result) {
        if (result) {
          performDeleteCategory(cid);
        }
      }
    });
  } else {
    if (confirm(`Are you sure you want to delete the category "${decodedName}"?`)) {
      performDeleteCategory(cid);
    }
  }
};

const performDeleteCategory = (cid) => {
  socket.emit('plugins.caiz.deleteSubCategory', {
    cid: cid,
    parentCid: currentCommunityId
  }, function(err, result) {
    if (err) {
      console.error('[caiz] Error deleting category:', err);
      if (typeof alerts !== 'undefined') {
        alerts.error(err.message || 'Failed to delete category');
      }
      return;
    }
    
    console.log('[caiz] Category deleted successfully');
    
    if (typeof alerts !== 'undefined') {
      alerts.success('Category deleted successfully');
    }
    
    loadSubCategories(); // Reload the list
  });
};

const openCategoryIconSelector = () => {
  if (typeof require !== 'undefined') {
    require(['iconSelect'], function(iconSelect) {
      const selectedIcon = document.getElementById('category-selected-icon');
      iconSelect.init($(selectedIcon), function(element, icon, styles) {
        if (!icon) return;
        
        // Update icon preview
        selectedIcon.className = '';
        let fullClass = 'fa fa-lg';
        if (icon) {
          fullClass += ' ' + icon;
        }
        if (styles && styles.length > 0) {
          fullClass += ' ' + styles.join(' ');
        }
        selectedIcon.className = fullClass;
        
        // Update hidden input
        document.getElementById('category-form-icon').value = icon;
      });
    });
  }
};

const escapeHtml = (text) => {
  if (!text) return '';
  // First decode any existing HTML entities, then escape properly
  const div = document.createElement('div');
  div.innerHTML = text;
  const decodedText = div.textContent || div.innerText || '';
  div.textContent = decodedText;
  return div.innerHTML;
};

// Drag and Drop functionality
let draggedElement = null;
let draggedIndex = -1;

const initializeDragAndDrop = () => {
  const tableBody = document.getElementById('categories-table-body');
  if (!tableBody) return;
  
  const rows = tableBody.querySelectorAll('.category-row');
  
  rows.forEach((row, index) => {
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragleave', handleDragLeave);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragend', handleDragEnd);
  });
};

const handleDragStart = (e) => {
  draggedElement = e.target.closest('tr');
  draggedIndex = Array.from(draggedElement.parentNode.children).indexOf(draggedElement);
  
  draggedElement.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', draggedElement.outerHTML);
  
  console.log('[caiz] Drag started:', draggedElement.dataset.cid);
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

const handleDragEnter = (e) => {
  e.preventDefault();
  const targetRow = e.target.closest('tr');
  if (targetRow && targetRow !== draggedElement) {
    targetRow.classList.add('drag-over');
  }
};

const handleDragLeave = (e) => {
  const targetRow = e.target.closest('tr');
  if (targetRow) {
    targetRow.classList.remove('drag-over');
  }
};

const handleDrop = (e) => {
  e.preventDefault();
  const targetRow = e.target.closest('tr');
  
  if (!targetRow || !draggedElement || targetRow === draggedElement) {
    return;
  }
  
  const targetIndex = Array.from(targetRow.parentNode.children).indexOf(targetRow);
  const tableBody = targetRow.parentNode;
  
  // Remove drag over styling
  targetRow.classList.remove('drag-over');
  
  // Perform the DOM manipulation
  if (draggedIndex < targetIndex) {
    tableBody.insertBefore(draggedElement, targetRow.nextSibling);
  } else {
    tableBody.insertBefore(draggedElement, targetRow);
  }
  
  console.log('[caiz] Dropped at position:', targetIndex);
  
  // Update the order on server
  updateCategoryOrder();
};

const handleDragEnd = (e) => {
  const targetRow = e.target.closest('tr');
  if (targetRow) {
    targetRow.classList.remove('dragging', 'drag-over');
  }
  
  // Clean up all drag over styling
  document.querySelectorAll('.category-row').forEach(row => {
    row.classList.remove('drag-over', 'dragging');
  });
  
  draggedElement = null;
  draggedIndex = -1;
  
  console.log('[caiz] Drag ended');
};

const updateCategoryOrder = () => {
  const tableBody = document.getElementById('categories-table-body');
  if (!tableBody) return;
  
  const rows = tableBody.querySelectorAll('.category-row');
  const newOrder = Array.from(rows).map(row => parseInt(row.dataset.cid));
  
  console.log('[caiz] New category order:', newOrder);
  
  // Send to server
  socket.emit('plugins.caiz.reorderSubCategories', {
    parentCid: currentCommunityId,
    categoryIds: newOrder
  }, function(err, result) {
    if (err) {
      console.error('[caiz] Error reordering categories:', err);
      if (typeof alerts !== 'undefined') {
        alerts.error(err.message || 'Failed to reorder categories');
      }
      // Reload to restore original order
      loadSubCategories();
      return;
    }
    
    console.log('[caiz] Categories reordered successfully');
    
    // Update local subcategories array to match new order
    const reorderedSubcategories = [];
    newOrder.forEach(cid => {
      const category = subcategories.find(cat => cat.cid == cid);
      if (category) {
        reorderedSubcategories.push(category);
      }
    });
    subcategories = reorderedSubcategories;
    
    if (typeof alerts !== 'undefined') {
      alerts.success('Categories reordered successfully');
    }
  });
};

// Make functions globally available for onclick handlers
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.changeMemberRole = changeMemberRole;
window.removeMember = removeMember;

// Setup icon selector using NodeBB's iconSelect module
const setupIconSelector = () => {
  const selectBtn = document.getElementById('icon-select-btn');
  const selectedIcon = document.getElementById('selected-icon');
  const iconInput = document.getElementById('community-icon');
  
  if (!selectBtn || !selectedIcon || !iconInput) {
    console.error('[caiz] Icon selector elements not found');
    return;
  }
  
  selectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[caiz] Opening icon selector');
    
    // Use NodeBB's iconSelect module if available
    if (typeof require !== 'undefined') {
      require(['iconSelect'], function(iconSelect) {
        // onModified callback receives: (element, icon, styles)
        iconSelect.init($(selectedIcon), function(element, icon, styles) {
          console.log('[caiz] Icon selected:', icon, 'Styles:', styles);
          
          if (!icon) {
            console.log('[caiz] No icon selected');
            return;
          }
          
          // Update the icon preview
          selectedIcon.className = '';
          // Build the full class string
          let fullClass = 'fa fa-2x';
          if (icon) {
            fullClass += ' ' + icon;
          }
          if (styles && styles.length > 0) {
            fullClass += ' ' + styles.join(' ');
          }
          selectedIcon.className = fullClass;
          
          // Store just the icon name without "fa-" prefix for database
          iconInput.value = icon;
          
          console.log('[caiz] Icon value set to:', icon);
          console.log('[caiz] Full class:', fullClass);
        });
      });
    } else {
      console.error('[caiz] NodeBB require not available, cannot load iconSelect module');
      // Fallback: show a simple alert
      if (typeof alerts !== 'undefined') {
        alerts.error('Icon selector not available');
      }
    }
  });
};

// Community Edit Form Functions
const loadCommunityEditData = async (cid) => {
  return new Promise((resolve, reject) => {
    socket.emit('plugins.caiz.getCommunityData', { cid }, function(err, data) {
      if (err) {
        console.error('[caiz] Error loading community data:', err);
        reject(err);
        return;
      }
      resolve(data);
    });
  });
};

const saveCommunityData = async (cid, formData) => {
  return new Promise((resolve, reject) => {
    const data = {
      cid: cid,
      name: formData.name,
      description: formData.description
    };
    
    // Include backgroundImage if provided
    if (formData.backgroundImage !== undefined) {
      data.backgroundImage = formData.backgroundImage;
    }
    
    // Include icon if provided
    if (formData.icon !== undefined) {
      data.icon = formData.icon;
    }
    
    // Include colors if provided
    if (formData.color !== undefined) {
      data.color = formData.color;
    }
    
    if (formData.bgColor !== undefined) {
      data.bgColor = formData.bgColor;
    }
    
    console.log('[caiz] Sending data to server:', data);
    
    socket.emit('plugins.caiz.updateCommunityData', data, function(err, result) {
      if (err) {
        console.error('[caiz] Error saving community data:', err);
        reject(err);
        return;
      }
      console.log('[caiz] Save result:', result);
      resolve(result);
    });
  });
};

function initializeCommunityEditForm(cid) {
  console.log('[caiz] Initializing community edit form for cid:', cid);
  
  // Wait for form to be available in DOM
  const waitForForm = (callback, attempts = 0) => {
    const form = document.getElementById('community-edit-form');
    if (form) {
      callback();
    } else if (attempts < 20) {
      setTimeout(() => waitForForm(callback, attempts + 1), 100);
    } else {
      console.error('[caiz] Community edit form not found after waiting');
    }
  };
  
  waitForForm(() => {
    const form = document.getElementById('community-edit-form');
    console.log('[caiz] Form found, loading data');
    
    // Setup logo type toggle functionality
    setupLogoTypeToggle();
    
    // Setup icon selector
    setupIconSelector();
    
    // Setup icon color pickers
    setupIconColorPickers();
    
    // Initialize category management
    initializeCategoryManagement(cid);
    
    // Initialize member management
    initializeMemberManagement(cid);
    
    // Load existing data
    loadCommunityEditData(cid).then(data => {
      console.log('[caiz] Loaded community data:', data);
      
      // Wait a bit more to ensure form fields are fully rendered
      setTimeout(() => {
        // Target elements specifically within the visible bootbox modal
        const bootboxModal = document.querySelector('.bootbox.show, .bootbox.in, .modal.show');
        if (!bootboxModal) {
          console.error('[caiz] No visible bootbox modal found');
          return;
        }
        
        console.log('[caiz] Found bootbox modal:', bootboxModal);
        
        // Find form fields within the bootbox modal only
        let nameField = bootboxModal.querySelector('#community-name, input[name="name"]');
        let descField = bootboxModal.querySelector('#community-description, textarea[name="description"]');
        
        console.log('[caiz] Bootbox modal class list:', bootboxModal.classList.toString());
        console.log('[caiz] Bootbox modal HTML preview:', bootboxModal.innerHTML.substring(0, 200) + '...');
        
        console.log('[caiz] Name field found:', !!nameField);
        console.log('[caiz] Desc field found:', !!descField);
        
        // Debug DOM structure
        const allInputs = document.querySelectorAll('input, textarea');
        console.log('[caiz] All inputs/textareas in DOM:', Array.from(allInputs).map(el => ({
          id: el.id,
          name: el.name,
          type: el.type,
          tagName: el.tagName
        })));
        
        if (nameField) {
          nameField.value = data.name || '';
          console.log('[caiz] Set community name:', data.name, 'Field value:', nameField.value);
          // Force a change event to make sure it's visible
          nameField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (descField) {
          descField.value = data.description || '';
          console.log('[caiz] Set community description:', data.description, 'Field value:', descField.value);
          // Force a change event to make sure it's visible
          descField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Determine whether to show icon or image
        if (data.backgroundImage) {
          // Switch to image mode
          const imageRadio = bootboxModal.querySelector('#logo-type-image');
          if (imageRadio) {
            imageRadio.checked = true;
            imageRadio.dispatchEvent(new Event('change'));
          }
          
          const currentLogoPreview = bootboxModal.querySelector('#current-logo-preview');
          const currentLogoImg = bootboxModal.querySelector('#current-logo-img');
          if (currentLogoImg && currentLogoPreview) {
            // Decode HTML entities in URL
            const decodedUrl = decodeHTMLEntities(data.backgroundImage);
            currentLogoImg.src = decodedUrl;
            currentLogoPreview.style.display = 'block';
            console.log('[caiz] Set current logo:', decodedUrl);
          }
        } else if (data.icon) {
          // Switch to icon mode (already default)
          const selectedIcon = bootboxModal.querySelector('#selected-icon');
          const iconInput = bootboxModal.querySelector('#community-icon');
          const iconColorInput = bootboxModal.querySelector('#icon-color');
          const bgColorInput = bootboxModal.querySelector('#icon-bg-color');
          const iconPreview = bootboxModal.querySelector('#selected-icon-preview');
          
          if (selectedIcon && iconInput) {
            // Set the current icon
            selectedIcon.className = '';
            selectedIcon.className = `fa ${data.icon} fa-2x`;
            iconInput.value = data.icon;
            console.log('[caiz] Set current icon:', data.icon);
            
            // Set colors if available
            if (data.color && iconColorInput) {
              iconColorInput.value = data.color;
              selectedIcon.style.color = data.color;
              console.log('[caiz] Set icon color:', data.color);
            }
            
            if (data.bgColor && bgColorInput && iconPreview) {
              bgColorInput.value = data.bgColor;
              iconPreview.style.background = data.bgColor;
              console.log('[caiz] Set background color:', data.bgColor);
            }
          }
        }
      }, 200);
    }).catch(err => {
      console.error('[caiz] Failed to load community data:', err);
      // Show error notification if available
      if (typeof alerts !== 'undefined') {
        alerts.error('Failed to load community data');
      }
    });
    
    // Setup file input change handler for logo preview
    setTimeout(() => {
      const bootboxModal = document.querySelector('.bootbox.show, .bootbox.in, .modal.show');
      if (!bootboxModal) {
        console.error('[caiz] No bootbox modal found for event handlers');
        return;
      }
      
      const logoInput = bootboxModal.querySelector('#community-logo, input[type="file"]');
      if (logoInput) {
        logoInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const newLogoPreview = bootboxModal.querySelector('#new-logo-preview');
              const newLogoImg = bootboxModal.querySelector('#new-logo-img');
              if (newLogoPreview && newLogoImg) {
                newLogoImg.src = e.target.result;
                newLogoPreview.style.display = 'block';
              }
            };
            reader.readAsDataURL(file);
          } else {
            const newLogoPreview = bootboxModal.querySelector('#new-logo-preview');
            if (newLogoPreview) {
              newLogoPreview.style.display = 'none';
            }
          }
        });
      }
      
      // Form validation on input
      const form = bootboxModal.querySelector('#community-edit-form, form');
      if (form) {
        form.addEventListener('input', () => validateForm());
        
        // Form submission
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          console.log('[caiz] Form submitted');
          
          if (!validateForm()) {
            console.log('[caiz] Form validation failed');
            return;
          }
          
          // Show loading state
          const submitBtn = form.querySelector('button[type="submit"]');
          const btnText = submitBtn.querySelector('.btn-text');
          const btnSpinner = submitBtn.querySelector('.btn-spinner');
          
          btnText.style.display = 'none';
          btnSpinner.style.display = 'inline';
          submitBtn.disabled = true;
          
          try {
            let backgroundImage = null;
            let icon = null;
            
            // Check which mode is selected
            const imageRadio = bootboxModal.querySelector('#logo-type-image');
            const isImageMode = imageRadio && imageRadio.checked;
            
            if (isImageMode) {
              // Handle file upload if a file was selected
              const logoFileInput = bootboxModal.querySelector('#community-logo, input[type="file"]');
              const logoFile = logoFileInput ? logoFileInput.files[0] : null;
              if (logoFile) {
              try {
                console.log('[caiz] Uploading logo file:', logoFile.name);
                backgroundImage = await uploadFile(logoFile);
                console.log('[caiz] Logo uploaded successfully:', backgroundImage);
              } catch (uploadError) {
                console.error('[caiz] Logo upload failed:', uploadError);
                console.error('[caiz] Logo upload error details:', uploadError.stack);
                
                if (typeof alerts !== 'undefined') {
                  alerts.error(`Logo upload failed: ${uploadError.message}. Please check console for details.`);
                }
                
                // For debugging purposes, throw the error instead of continuing
                // This will keep the modal open and show detailed error information
                throw new Error(`Logo upload failed: ${uploadError.message}`);
              }
              }
            } else {
              // Get selected icon and colors
              const iconInput = bootboxModal.querySelector('#community-icon');
              icon = iconInput ? iconInput.value : null;
              console.log('[caiz] Using icon:', icon);
            }
            
            const nameFieldSubmit = bootboxModal.querySelector('#community-name, input[name="name"]');
            const descFieldSubmit = bootboxModal.querySelector('#community-description, textarea[name="description"]');
            
            const data = {
              name: nameFieldSubmit ? nameFieldSubmit.value : '',
              description: descFieldSubmit ? descFieldSubmit.value : ''
            };
            
            // Include either backgroundImage or icon based on selection
            if (isImageMode && backgroundImage) {
              data.backgroundImage = backgroundImage;
              data.icon = ''; // Clear icon when using image
              data.color = ''; // Clear color when using image
              data.bgColor = ''; // Clear bgColor when using image
            } else if (!isImageMode && icon) {
              data.icon = icon;
              data.backgroundImage = ''; // Clear image when using icon
              
              // Get icon colors
              const iconColorInput = bootboxModal.querySelector('#icon-color');
              const bgColorInput = bootboxModal.querySelector('#icon-bg-color');
              
              if (iconColorInput && iconColorInput.value !== '#000000') {
                data.color = iconColorInput.value;
              }
              
              if (bgColorInput && bgColorInput.value !== '#f8f9fa') {
                data.bgColor = bgColorInput.value;
              }
              
              console.log('[caiz] Icon colors - color:', data.color, 'bgColor:', data.bgColor);
            }
            
            console.log('[caiz] Saving community data:', data);
            await saveCommunityData(cid, data);
            
            // Success notification
            if (typeof alerts !== 'undefined') {
              alerts.success('Community information updated successfully');
            }
            
            // Close modal and refresh page only on success
            if (typeof bootbox !== 'undefined') {
              $('.bootbox').modal('hide');
            } else {
              closeCommunityEditModal();
            }
            
            setTimeout(() => window.location.reload(), 500);
            
          } catch (error) {
            console.error('[caiz] Error saving community data:', error);
            console.error('[caiz] Full error details:', error.stack);
            
            // Error notification - DO NOT RELOAD on error
            if (typeof alerts !== 'undefined') {
              alerts.error(error.message || 'An error occurred while saving');
            }
            
            // Keep modal open for debugging
            console.log('[caiz] Error occurred - modal kept open for debugging');
          } finally {
            // Reset loading state
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            submitBtn.disabled = false;
          }
        });
      }
    }, 300);
  });
}

const uploadFile = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      console.log('[caiz] No file provided to uploadFile');
      resolve(null);
      return;
    }
    
    console.log('[caiz] Starting file upload for:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const formData = new FormData();
    formData.append('files[]', file);
    
    // Use NodeBB's file upload endpoint
    console.log('[caiz] Sending request to /api/post/upload');
    
    // Get CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                     document.querySelector('input[name="_csrf"]')?.value ||
                     window.config?.csrf_token;
    
    const headers = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Add CSRF token if available
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
      console.log('[caiz] Adding CSRF token to upload request');
    } else {
      console.warn('[caiz] No CSRF token found - upload might fail');
    }
    
    fetch('/api/post/upload', {
      method: 'POST',
      body: formData,
      headers: headers
    })
    .then(response => {
      console.log('[caiz] Upload response status:', response.status);
      console.log('[caiz] Upload response headers:', response.headers);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('[caiz] Upload response data:', data);
      
      // Handle NodeBB's response format: { response: { images: [...] } } or direct array
      let imageUrl = null;
      
      if (data && data.response && data.response.images && data.response.images.length > 0) {
        // NodeBB format: { response: { images: [{url: "..."}] } }
        imageUrl = data.response.images[0].url;
        console.log('[caiz] Found URL in response.images:', imageUrl);
      } else if (data && Array.isArray(data) && data.length > 0 && data[0].url) {
        // Direct array format: [{url: "..."}]
        imageUrl = data[0].url;
        console.log('[caiz] Found URL in direct array:', imageUrl);
      } else {
        console.error('[caiz] Upload failed - no URL in response:', data);
        reject(new Error('File upload failed - no URL returned'));
        return;
      }
      
      console.log('[caiz] Upload successful, URL:', imageUrl);
      resolve(imageUrl);
    })
    .catch(error => {
      console.error('[caiz] File upload error:', error);
      console.error('[caiz] Error stack:', error.stack);
      reject(new Error(`File upload failed: ${error.message}`));
    });
  });
};

const validateForm = () => {
  const bootboxModal = document.querySelector('.bootbox.show, .bootbox.in, .modal.show');
  if (!bootboxModal) {
    console.error('[caiz] No bootbox modal found for validation');
    return false;
  }
  
  const form = bootboxModal.querySelector('#community-edit-form, form');
  if (!form) {
    console.error('[caiz] No form found in bootbox modal');
    return false;
  }
  
  let isValid = true;
  
  // Name validation
  const nameField = bootboxModal.querySelector('#community-name, input[name="name"]');
  console.log('[caiz] Validating name field:', nameField);
  console.log('[caiz] Name field value:', nameField ? nameField.value : 'field not found');
  
  if (!nameField) {
    console.error('[caiz] Name field not found during validation');
    isValid = false;
  } else if (!nameField.value.trim()) {
    showFieldError(nameField, 'Community name is required');
    console.log('[caiz] Name validation failed: empty value');
    isValid = false;
  } else {
    clearFieldError(nameField);
    console.log('[caiz] Name validation passed');
  }
  
  console.log('[caiz] Form validation result:', isValid);
  return isValid;
};

const showFieldError = (field, message) => {
  field.classList.add('is-invalid');
  const feedback = field.parentNode.querySelector('.invalid-feedback');
  if (feedback) {
    feedback.textContent = message;
  }
};

const clearFieldError = (field) => {
  field.classList.remove('is-invalid');
};

// Member Management Functions
let currentMembers = [];
let currentUserRole = null;

const initializeMemberManagement = (cid) => {
  console.log('[caiz] Initializing member management for cid:', cid);
  currentCommunityId = cid;
  
  setupMemberEventHandlers();
  loadMembers();
};

const setupMemberEventHandlers = () => {
  // Add member button
  const addBtn = document.getElementById('add-member-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => showAddMemberForm());
  }
  
  // Cancel add member form
  const cancelBtns = document.querySelectorAll('#cancel-add-member, #cancel-add-member-btn');
  cancelBtns.forEach(btn => {
    btn.addEventListener('click', () => hideAddMemberForm());
  });
  
  // Add member form submit
  const form = document.getElementById('add-member-form');
  if (form) {
    form.addEventListener('submit', handleAddMemberSubmit);
  }
  
  // Member search input
  const searchInput = document.getElementById('member-search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterMembers(e.target.value);
      }, 300);
    });
  }
};

const loadMembers = async () => {
  if (!currentCommunityId) return;
  
  try {
    console.log('[caiz] Loading members for cid:', currentCommunityId);
    showMembersLoading();
    
    socket.emit('plugins.caiz.getMembers', { cid: currentCommunityId }, function(err, data) {
      // Always hide loading state
      const loadingEl = document.getElementById('members-loading');
      if (loadingEl) loadingEl.style.display = 'none';
      
      if (err) {
        console.error('[caiz] Error loading members:', err);
        showMembersError(err.message);
        return;
      }
      
      currentMembers = data || [];
      console.log('[caiz] Loaded members:', currentMembers);
      
      // Get current user's role
      if (app.user && app.user.uid) {
        const currentUser = currentMembers.find(m => m.uid == app.user.uid);
        currentUserRole = currentUser ? currentUser.role : null;
      }
      
      renderMembers();
    });
  } catch (error) {
    console.error('[caiz] Error in loadMembers:', error);
    // Hide loading state on error
    const loadingEl = document.getElementById('members-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    showMembersError(error.message);
  }
};

const showMembersLoading = () => {
  const loadingEl = document.getElementById('members-loading');
  const emptyEl = document.getElementById('members-empty');
  const contentEl = document.getElementById('members-content');
  
  if (loadingEl) loadingEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'none';
};

const showMembersError = (message) => {
  const loadingEl = document.getElementById('members-loading');
  const emptyEl = document.getElementById('members-empty');
  const contentEl = document.getElementById('members-content');
  
  if (loadingEl) loadingEl.style.display = 'none';
  if (emptyEl) emptyEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'none';
  
  // Show error message
  if (typeof alerts !== 'undefined') {
    alerts.error(`Failed to load members: ${message}`);
  }
};

const renderMembers = () => {
  const loadingEl = document.getElementById('members-loading');
  const emptyEl = document.getElementById('members-empty');
  const contentEl = document.getElementById('members-content');
  const tableBody = document.getElementById('members-table-body');
  
  if (loadingEl) loadingEl.style.display = 'none';
  
  if (!currentMembers.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
    return;
  }
  
  if (emptyEl) emptyEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';
  
  // Render table rows
  if (tableBody) {
    tableBody.innerHTML = currentMembers.map(member => {
      const decodedUsername = decodeHTMLEntities(member.username || '');
      const roleClass = getRoleClass(member.role);
      const canManage = canManageMember(member);
      
      return `
        <tr data-uid="${member.uid}" class="member-row">
          <td>
            <div class="d-flex align-items-center gap-2">
              ${member.picture ? 
                `<img src="${member.picture}" alt="${escapeHtml(decodedUsername)}" class="rounded-circle" style="width: 32px; height: 32px;">` : 
                `<div class="rounded-circle bg-secondary d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; color: white; font-size: 14px;">${decodedUsername.charAt(0).toUpperCase()}</div>`
              }
              <div>
                <strong>${escapeHtml(decodedUsername)}</strong>
                <br>
                <small class="text-muted">@${member.userslug || member.username}</small>
              </div>
            </div>
          </td>
          <td>
            <span class="badge ${roleClass}">${getRoleDisplayName(member.role)}</span>
          </td>
          <td>
            <small class="text-muted">${formatDate(member.joindate)}</small>
          </td>
          <td>
            <small class="text-muted">${formatDate(member.lastonline)}</small>
          </td>
          <td class="text-end">
            ${canManage ? `
              <div class="btn-group btn-group-sm">
                <select class="form-select form-select-sm" onchange="changeMemberRole(${member.uid}, this.value)" style="width: auto;">
                  <option value="">Change Role</option>
                  ${getRoleOptions(member.role, member.uid).join('')}
                </select>
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeMember(${member.uid}, '${escapeHtml(decodedUsername)}')" title="Remove">
                  <i class="fa fa-trash"></i>
                </button>
              </div>
            ` : '-'}
          </td>
        </tr>
      `;
    }).join('');
  }
};

const filterMembers = (searchTerm) => {
  const tableBody = document.getElementById('members-table-body');
  if (!tableBody) return;
  
  const rows = tableBody.querySelectorAll('.member-row');
  const term = searchTerm.toLowerCase();
  
  rows.forEach(row => {
    const username = row.querySelector('strong').textContent.toLowerCase();
    const userslug = row.querySelector('small').textContent.toLowerCase();
    
    if (username.includes(term) || userslug.includes(term)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
};

const getRoleClass = (role) => {
  const classes = {
    owner: 'bg-danger',
    manager: 'bg-warning text-dark',
    member: 'bg-primary',
    banned: 'bg-dark'
  };
  return classes[role] || 'bg-secondary';
};

const getRoleDisplayName = (role) => {
  const names = {
    owner: 'Owner',
    manager: 'Manager',
    member: 'Member',
    banned: 'Banned'
  };
  return names[role] || role;
};

const canManageMember = (member) => {
  if (!currentUserRole) return false;
  if (member.uid == app.user.uid) return false; // Can't manage yourself
  
  // Owners can manage everyone
  if (currentUserRole === 'owner') return true;
  
  // Managers can manage members and banned users
  if (currentUserRole === 'manager') {
    return member.role === 'member' || member.role === 'banned';
  }
  
  return false;
};

const getRoleOptions = (currentRole, memberUid) => {
  const options = [];
  const isCurrentUser = memberUid == app.user.uid;
  
  if (currentUserRole === 'owner') {
    if (currentRole !== 'owner') options.push('<option value="owner">Owner</option>');
    if (currentRole !== 'manager') options.push('<option value="manager">Manager</option>');
    if (currentRole !== 'member') options.push('<option value="member">Member</option>');
    if (currentRole !== 'banned' && !isCurrentUser) options.push('<option value="banned">Banned</option>');
  } else if (currentUserRole === 'manager') {
    if (currentRole !== 'member') options.push('<option value="member">Member</option>');
    if (currentRole !== 'banned' && !isCurrentUser) options.push('<option value="banned">Banned</option>');
  }
  
  return options;
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = new Date(parseInt(timestamp));
  return date.toLocaleDateString();
};

const showAddMemberForm = () => {
  const container = document.getElementById('add-member-form-container');
  const input = document.getElementById('add-member-username');
  
  if (container) {
    container.style.display = 'block';
  }
  if (input) {
    input.focus();
  }
};

const hideAddMemberForm = () => {
  const container = document.getElementById('add-member-form-container');
  const form = document.getElementById('add-member-form');
  
  if (container) {
    container.style.display = 'none';
  }
  if (form) {
    form.reset();
    form.classList.remove('was-validated');
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }
};

const handleAddMemberSubmit = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const username = formData.get('username');
  
  // Validate
  if (!username || !username.trim()) {
    showFieldError(form.querySelector('#add-member-username'), 'Username is required');
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.add-member-btn-text');
  const btnSpinner = submitBtn.querySelector('.add-member-btn-spinner');
  
  // Show loading
  if (btnText) btnText.style.display = 'none';
  if (btnSpinner) btnSpinner.style.display = 'inline';
  submitBtn.disabled = true;
  
  try {
    console.log('[caiz] Adding member:', username.trim());
    
    socket.emit('plugins.caiz.addMember', {
      cid: currentCommunityId,
      username: username.trim()
    }, function(err, result) {
      if (err) {
        console.error('[caiz] Error adding member:', err);
        if (typeof alerts !== 'undefined') {
          alerts.error(err.message || 'Failed to add member');
        }
        return;
      }
      
      console.log('[caiz] Member added successfully:', result);
      
      if (typeof alerts !== 'undefined') {
        alerts.success('Member added successfully');
      }
      
      hideAddMemberForm();
      loadMembers(); // Reload the list
    });
    
  } catch (error) {
    console.error('[caiz] Error in add member submit:', error);
    if (typeof alerts !== 'undefined') {
      alerts.error(error.message || 'An error occurred');
    }
  } finally {
    // Reset loading state
    if (btnText) btnText.style.display = 'inline';
    if (btnSpinner) btnSpinner.style.display = 'none';
    submitBtn.disabled = false;
  }
};

const changeMemberRole = (targetUid, newRole) => {
  if (!newRole) return;
  
  const member = currentMembers.find(m => m.uid == targetUid);
  if (!member) return;
  
  const confirmMessage = `Are you sure you want to change ${member.username}'s role to ${getRoleDisplayName(newRole)}?`;
  
  if (typeof bootbox !== 'undefined') {
    bootbox.confirm({
      title: 'Change Member Role',
      message: confirmMessage,
      buttons: {
        confirm: {
          label: '<i class="fa fa-check"></i> Confirm',
          className: 'btn-primary'
        },
        cancel: {
          label: 'Cancel',
          className: 'btn-secondary'
        }
      },
      callback: function(result) {
        if (result) {
          performRoleChange(targetUid, newRole);
        }
      }
    });
  } else {
    if (confirm(confirmMessage)) {
      performRoleChange(targetUid, newRole);
    }
  }
};

const performRoleChange = (targetUid, newRole) => {
  socket.emit('plugins.caiz.changeMemberRole', {
    cid: currentCommunityId,
    targetUid: targetUid,
    newRole: newRole
  }, function(err, result) {
    if (err) {
      console.error('[caiz] Error changing member role:', err);
      if (typeof alerts !== 'undefined') {
        alerts.error(err.message || 'Failed to change member role');
      }
      return;
    }
    
    console.log('[caiz] Member role changed successfully');
    
    if (typeof alerts !== 'undefined') {
      alerts.success('Member role updated successfully');
    }
    
    loadMembers(); // Reload the list
  });
};

const removeMember = (targetUid, username) => {
  const decodedUsername = decodeHTMLEntities(username || '');
  
  if (typeof bootbox !== 'undefined') {
    bootbox.confirm({
      title: 'Remove Member',
      message: `Are you sure you want to remove "${escapeHtml(decodedUsername)}" from this community? This action cannot be undone.`,
      buttons: {
        confirm: {
          label: '<i class="fa fa-trash"></i> Remove',
          className: 'btn-danger'
        },
        cancel: {
          label: 'Cancel',
          className: 'btn-secondary'
        }
      },
      callback: function(result) {
        if (result) {
          performRemoveMember(targetUid);
        }
      }
    });
  } else {
    if (confirm(`Are you sure you want to remove "${decodedUsername}" from this community?`)) {
      performRemoveMember(targetUid);
    }
  }
};

const performRemoveMember = (targetUid) => {
  socket.emit('plugins.caiz.removeMember', {
    cid: currentCommunityId,
    targetUid: targetUid
  }, function(err, result) {
    if (err) {
      console.error('[caiz] Error removing member:', err);
      if (typeof alerts !== 'undefined') {
        alerts.error(err.message || 'Failed to remove member');
      }
      return;
    }
    
    console.log('[caiz] Member removed successfully');
    
    if (typeof alerts !== 'undefined') {
      alerts.success('Member removed successfully');
    }
    
    loadMembers(); // Reload the list
  });
};