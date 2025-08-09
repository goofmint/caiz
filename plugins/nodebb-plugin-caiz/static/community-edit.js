// Community Edit Button Management

const addEditButton = (cid) => {
  console.log('[caiz] Adding edit button for community', cid);
  
  // Check if button already exists
  if (document.querySelector('.community-edit-btn')) {
    console.log('[caiz] Edit button already exists');
    return;
  }
  
  const editBtn = $('<button>')
    .addClass('btn btn-primary community-edit-btn')
    .attr('data-cid', cid)
    .html('<i class="fa fa-edit"></i> <span>Edit Community</span>');
  
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
      
      // Add edit button to the same container with proper spacing
      editBtn.css({ marginRight: '10px' });
      followContainer.prepend(editBtn);
      insertLocation = 'in follow button container';
    } else {
      // Look for the right side container in category header
      const rightContainer = $('.category-header .d-flex.justify-content-between > div:last-child').first();
      if (rightContainer.length) {
        editBtn.css({ marginRight: '10px' });
        rightContainer.prepend(editBtn);
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
          editBtn.css({ marginRight: '10px' });
          rightDiv.prepend(editBtn);
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
                <label for="community-slug" class="form-label">Slug *</label>
                <input type="text" class="form-control" id="community-slug" name="slug" required pattern="^[a-z0-9-]+$">
                <div class="form-text">Only lowercase letters, numbers, and hyphens allowed</div>
                <div class="invalid-feedback"></div>
              </div>
              
              <div class="mb-3">
                <label for="community-description" class="form-label">Description</label>
                <textarea class="form-control" id="community-description" name="description" rows="4"></textarea>
                <div class="invalid-feedback"></div>
              </div>
              
              <div class="mb-3">
                <label for="community-logo" class="form-label">Logo Image</label>
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
  `;
};

const resetModalToFirstTab = () => {
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
};

const initializeModalNavigation = () => {
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
};

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
      slug: formData.slug,
      description: formData.description,
      backgroundImage: formData.backgroundImage
    };
    
    socket.emit('plugins.caiz.updateCommunityData', data, function(err, result) {
      if (err) {
        console.error('[caiz] Error saving community data:', err);
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

const initializeCommunityEditForm = (cid) => {
  console.log('[caiz] Initializing community edit form for cid:', cid);
  
  const form = document.getElementById('community-edit-form');
  if (!form) {
    console.log('[caiz] Community edit form not found');
    return;
  }
  
  // Load existing data
  loadCommunityEditData(cid).then(data => {
    console.log('[caiz] Loaded community data:', data);
    document.getElementById('community-name').value = data.name || '';
    document.getElementById('community-slug').value = data.slug || '';
    document.getElementById('community-description').value = data.description || '';
    
    // Show current logo if exists
    if (data.backgroundImage) {
      const currentLogoPreview = document.getElementById('current-logo-preview');
      const currentLogoImg = document.getElementById('current-logo-img');
      currentLogoImg.src = data.backgroundImage;
      currentLogoPreview.style.display = 'block';
    }
  }).catch(err => {
    console.error('[caiz] Failed to load community data:', err);
    // Show error notification if available
    if (typeof alerts !== 'undefined') {
      alerts.error('Failed to load community data');
    }
  });
  
  // File input change handler for logo preview
  const logoInput = document.getElementById('community-logo');
  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newLogoPreview = document.getElementById('new-logo-preview');
        const newLogoImg = document.getElementById('new-logo-img');
        newLogoImg.src = e.target.result;
        newLogoPreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      document.getElementById('new-logo-preview').style.display = 'none';
    }
  });
  
  // Form validation on input
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
      
      // Handle file upload if a file was selected
      const logoFile = document.getElementById('community-logo').files[0];
      if (logoFile) {
        console.log('[caiz] Uploading logo file:', logoFile.name);
        backgroundImage = await uploadFile(logoFile);
        console.log('[caiz] Logo uploaded successfully:', backgroundImage);
      }
      
      const data = {
        name: document.getElementById('community-name').value,
        slug: document.getElementById('community-slug').value,
        description: document.getElementById('community-description').value
      };
      
      if (backgroundImage) {
        data.backgroundImage = backgroundImage;
      }
      
      console.log('[caiz] Saving community data:', data);
      await saveCommunityData(cid, data);
      
      // Success notification
      if (typeof alerts !== 'undefined') {
        alerts.success('Community information updated successfully');
      }
      
      // Close modal and refresh page
      if (typeof bootbox !== 'undefined') {
        $('.bootbox').modal('hide');
      } else {
        closeCommunityEditModal();
      }
      
      setTimeout(() => window.location.reload(), 500);
      
    } catch (error) {
      console.error('[caiz] Error saving community data:', error);
      // Error notification
      if (typeof alerts !== 'undefined') {
        alerts.error(error.message || 'An error occurred while saving');
      }
    } finally {
      // Reset loading state
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
};

const uploadFile = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    
    const formData = new FormData();
    formData.append('files[]', file);
    
    // Use NodeBB's file upload endpoint
    fetch('/api/post/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data && data.length > 0 && data[0].url) {
        resolve(data[0].url);
      } else {
        reject(new Error('File upload failed'));
      }
    })
    .catch(error => {
      console.error('[caiz] File upload error:', error);
      reject(new Error('File upload failed'));
    });
  });
};

const validateForm = () => {
  const form = document.getElementById('community-edit-form');
  if (!form) return true;
  
  let isValid = true;
  
  // Name validation
  const nameField = document.getElementById('community-name');
  if (!nameField.value.trim()) {
    showFieldError(nameField, 'Community name is required');
    isValid = false;
  } else {
    clearFieldError(nameField);
  }
  
  // Slug validation
  const slugField = document.getElementById('community-slug');
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugField.value.trim()) {
    showFieldError(slugField, 'Slug is required');
    isValid = false;
  } else if (!slugPattern.test(slugField.value)) {
    showFieldError(slugField, 'Only lowercase letters, numbers, and hyphens are allowed');
    isValid = false;
  } else {
    clearFieldError(slugField);
  }
  
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