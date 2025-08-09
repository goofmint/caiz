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
  
  // Find existing buttons container first
  let buttonContainer = $('.category-tools, .topic-header .btn-toolbar, .btn-group').first();
  
  if (buttonContainer.length) {
    // Add to existing button container
    buttonContainer.prepend(editBtn);
    editBtn.css({ position: 'relative', top: 'auto', right: 'auto', marginRight: '10px' });
    console.log('[caiz] Edit button added to existing button container');
  } else {
    // Look for category header
    let headerContainer = $('.category-header, [component="category"] .row').first();
    if (!headerContainer.length) {
      headerContainer = $('[component="category"]').first();
    }
    
    if (headerContainer.length) {
      headerContainer.css('position', 'relative').append(editBtn);
      console.log('[caiz] Edit button added to category header');
    } else {
      // Fallback: add to body as fixed position
      $('body').append(editBtn);
      editBtn.addClass('fixed-position');
      console.log('[caiz] Edit button added as fixed position');
    }
  }
  
  // Add click event (placeholder for now - will connect to modal in task 03)
  editBtn.on('click', function() {
    console.log('[caiz] Edit button clicked for community', cid);
    // TODO: Open edit modal (task 03)
    alert('Edit modal will be implemented in task 03');
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

const initializeCommunityEdit = async () => {
  console.log('[caiz] Initializing community edit for page:', ajaxify.data.template.name);
  
  // Only run on category pages
  if (ajaxify.data.template.name !== 'category') {
    console.log('[caiz] Not a category page, skipping community edit');
    return;
  }
  
  // Check if user is logged in
  if (!app.user || !app.user.uid) {
    console.log('[caiz] User not logged in, skipping community edit');
    return;
  }
  
  const cid = ajaxify.data.cid;
  if (!cid) {
    console.log('[caiz] No category ID found, skipping community edit');
    return;
  }
  
  console.log('[caiz] Checking ownership for category ID:', cid);
  const isOwner = await checkCommunityOwnership(cid);
  
  if (isOwner) {
    console.log('[caiz] User is owner, adding edit button');
    addEditButton(cid);
  } else {
    console.log('[caiz] User is not owner, no edit button');
  }
};

// Initialize on page load
$(window).on('action:ajaxify.end', function(event, data) {
  // Small delay to ensure DOM is ready
  setTimeout(initializeCommunityEdit, 100);
});

// Initialize on initial page load
$(document).ready(function() {
  if (typeof ajaxify !== 'undefined') {
    setTimeout(initializeCommunityEdit, 100);
  }
});