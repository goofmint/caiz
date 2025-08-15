// Community Edit Core
// Main initialization and coordination

// Global variables
let currentCommunityId = null;
let subcategories = [];
let draggedElement = null;
let draggedIndex = -1;
let currentMembers = [];
let currentUserRole = null;

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
  const { alert } = await CommunityEditUtils.getAlert();
  const translator = await CommunityEditUtils.getTranslate();
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
    let buttonText;
    
    switch (userRole) {
      case 'owner':
        buttonText = 'Owner';
        break;
      case 'manager':
        buttonText = 'Manager';
        break;
      case 'member':
        buttonText = 'Member';
        break;
      case 'banned':
        buttonText = 'Banned';
        break;
      case 'guest':
      default:
        buttonText = getText('caiz:follow'); // "Become Member"
        break;
    }
    
    followButton.text(buttonText);
    
    // Disable button for owner and banned users (manager can leave)
    if (userRole === 'owner' || userRole === 'banned') {
      followButton.prop('disabled', true);
      followButton.css('cursor', 'not-allowed');
    } else {
      followButton.prop('disabled', false);
      followButton.css('cursor', 'pointer');
    }
    
    if (typeof updateCommunities !== 'undefined') {
      updateCommunities();
    }
  };

  // Get initial follow status and user role
  let userRole = 'guest';
  socket.emit('plugins.caiz.getMemberRole', { cid }, function (err, response) {
    if (err) {
      console.error('[caiz] Error getting follow status:', err);
      if (typeof alerts !== 'undefined') {
        alerts.error(err.message || getText('caiz:error.generic'));
      }
      return;
    }
    
    userRole = response.role || 'guest';
    followStatus = (userRole !== 'guest' && userRole !== 'banned');
    changeButtonLabel();
    console.log('[caiz] Membership status updated - role:', userRole);
  });

  // Remove existing event handlers to prevent duplicates
  followButton.off('mouseenter mouseleave click');

  // Add hover effects only for actionable roles
  followButton.on('mouseenter', () => {
    if (userRole === 'guest') {
      followButton.text(getText('caiz:follow')); // "メンバーになる" のまま
    } else if (userRole === 'member' || userRole === 'manager') {
      followButton.text(getText('caiz:unfollowing')); // "メンバー解除"
    }
  });

  followButton.on('mouseleave', () => {
    changeButtonLabel(); // Reset to proper label
  });

  // Add click handler
  followButton.on('click', () => {
    // Only allow action for guest (join), member (leave), or manager (leave)
    if (userRole !== 'guest' && userRole !== 'member' && userRole !== 'manager') {
      return; // No action for owner, banned
    }
    
    const action = (userRole === 'member' || userRole === 'manager') ? 
      'plugins.caiz.unfollowCommunity' : 
      'plugins.caiz.followCommunity';
      
    socket.emit(action, { cid }, function (err, response) {
      if (err) {
        console.error('[caiz] Membership action error:', err);
        if (typeof alerts !== 'undefined') {
          alerts.error(err.message || getText('caiz:error.generic'));
        }
        return;
      }
      
      userRole = response.role || 'guest';
      followStatus = (userRole !== 'guest' && userRole !== 'banned');
      if (typeof alerts !== 'undefined') {
        const successKey = (userRole === 'member' || userRole === 'manager' || userRole === 'owner') ? 'caiz:follow_success' : 'caiz:unfollow_success';
        alerts.success(getText(successKey));
      }
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
  console.log('[caiz] Opening community edit modal for cid:', cid);
  
  const modalElement = document.getElementById('community-edit-modal');
  if (!modalElement) {
    console.error('[caiz] Community edit modal not found in DOM');
    return;
  }
  
  // Show the modal using jQuery/Bootstrap
  if (typeof $ !== 'undefined' && $.fn.modal) {
    // Remove any existing event listeners to prevent duplicates
    $(modalElement).off('shown.bs.modal.communityEdit');
    
    // Initialize the form when modal is shown
    $(modalElement).on('shown.bs.modal.communityEdit', function () {
      // Re-initialize modal navigation to ensure events are properly bound
      initializeModalNavigation();
      CommunityEditForm.initializeCommunityEditForm(cid);
    });
    
    $(modalElement).modal('show');
  } else {
    console.error('[caiz] jQuery or Bootstrap modal not available');
  }
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
  
  if (modalElement && typeof $ !== 'undefined' && $.fn.modal) {
    $(modalElement).modal('hide');
  }
  
  // Reset initialization flags when modal is closed
  window.membersInitialized = false;
  window.categoriesInitialized = false;
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
    item.addEventListener('click', async function(e) {
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
        
        // Initialize tab-specific content when switching
        if (tabName === 'members' && !window.membersInitialized) {
          console.log('[caiz] First time switching to members tab, initializing...');
          setupMemberEventHandlers();
          loadMembers();
          window.membersInitialized = true;
        } else if (tabName === 'categories' && !window.categoriesInitialized) {
          console.log('[caiz] First time switching to categories tab, initializing...');
          setupCategoryEventHandlers();
          await loadSubCategories();
          window.categoriesInitialized = true;
        }
      }
      
      console.log('[caiz] Switched to tab:', tabName);
    });
  });
}