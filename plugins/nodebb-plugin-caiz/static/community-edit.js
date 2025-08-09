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
});