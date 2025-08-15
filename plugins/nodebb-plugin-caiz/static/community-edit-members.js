// Community Edit Members Management
// Handles member management functionality

// Member Management Functions
function initializeMemberManagement(cid) {
  console.log('[caiz] DEBUG: Initializing member management for cid:', cid);
  currentCommunityId = cid;
  
  // Don't load members immediately - wait for tab switch
  // Just store the cid for later use
}

function setupMemberEventHandlers() {
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
  
  // Username autocomplete for add member
  const usernameInput = document.getElementById('add-member-username');
  if (usernameInput) {
    initializeUsernameAutocomplete(usernameInput);
  }
}

async function loadMembers() {
  if (!currentCommunityId) return;
  
  try {
    console.log('[caiz] Loading members for cid:', currentCommunityId);
    showMembersLoading();
    
    console.log('[caiz] DEBUG: Emitting plugins.caiz.getMembers with cid:', currentCommunityId);
    socket.emit('plugins.caiz.getMembers', { cid: currentCommunityId }, function(err, data) {
      console.log('[caiz] DEBUG: getMembers callback received, err:', err, 'data:', data);
      
      // Always hide loading state
      const loadingEl = document.getElementById('members-loading');
      if (loadingEl) {
        console.log('[caiz] DEBUG: Hiding loading element');
        loadingEl.style.display = 'none';
      } else {
        console.log('[caiz] DEBUG: Loading element not found');
      }
      
      if (err) {
        console.error('[caiz] Error loading members:', err);
        showMembersError(err.message);
        return;
      }
      
      currentMembers = data || [];
      console.log('[caiz] DEBUG: currentMembers set to:', currentMembers);
      console.log('[caiz] DEBUG: currentMembers length:', currentMembers.length);
      console.log('[caiz] DEBUG: currentMembers type:', typeof currentMembers);
      console.log('[caiz] DEBUG: Is array?', Array.isArray(currentMembers));
      
      // Get current user's role
      console.log('[caiz] DEBUG: app.user:', app.user);
      if (app.user && app.user.uid) {
        const currentUser = currentMembers.find(m => m.uid == app.user.uid);
        currentUserRole = currentUser ? currentUser.role : null;
        console.log('[caiz] DEBUG: Current user role:', currentUserRole, 'currentUser:', currentUser);
      }
      
      console.log('[caiz] DEBUG: Calling renderMembers()');
      renderMembers();
    });
  } catch (error) {
    console.error('[caiz] Error in loadMembers:', error);
    // Hide loading state on error
    const loadingEl = document.getElementById('members-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    showMembersError(error.message);
  }
}

function showMembersLoading() {
  const loadingEl = document.getElementById('members-loading');
  const emptyEl = document.getElementById('members-empty');
  const contentEl = document.getElementById('members-content');
  
  if (loadingEl) loadingEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'none';
}

function showMembersError(message) {
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
}

async function renderMembers() {
  console.log('[caiz] DEBUG: renderMembers() called');
  
  const loadingEl = document.getElementById('members-loading');
  const emptyEl = document.getElementById('members-empty');
  const contentEl = document.getElementById('members-content');
  const tableBody = document.getElementById('members-table-body');
  
  if (loadingEl) loadingEl.style.display = 'none';
  
  if (!currentMembers.length) {
    console.log('[caiz] DEBUG: No members, showing empty state');
    if (emptyEl) emptyEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
    return;
  }
  
  console.log('[caiz] DEBUG: Members found, showing content');
  if (emptyEl) emptyEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';
  
  // Check if tableBody exists
  if (!tableBody) {
    console.error('[caiz] members-table-body element not found');
    return;
  }
  
  try {
    // Render table rows using template
    const renderedRows = await Promise.all(
      currentMembers.map(async (member) => {
        const decodedUsername = CommunityEditUtils.decodeHTMLEntities(member.username || '');
        const roleClass = CommunityEditUtils.getRoleClass(member.role);
        const canManage = CommunityEditUtils.canManageMember(member);
        const roleOptions = CommunityEditUtils.getRoleOptions(member.role, member.uid);
        
        // Prepare template data
        const templateData = {
          uid: member.uid,
          username: decodedUsername,
          userslug: member.userslug || member.username,
          picture: member.picture,
          firstLetter: decodedUsername.charAt(0).toUpperCase(),
          roleClass: roleClass,
          roleDisplayName: CommunityEditUtils.getRoleDisplayName(member.role),
          joindate: CommunityEditUtils.formatDate(member.joindate),
          lastonline: CommunityEditUtils.formatDate(member.lastonline),
          canManage: canManage,
          roleOptions: roleOptions
        };
        
        // Render template
        return await CommunityEditUtils.parseAndTranslate('partials/member-row', templateData);
      })
    );
    
    // Update DOM with all rendered rows
    tableBody.innerHTML = renderedRows.join('');
    
    // Add event listeners after rendering
    setupMemberRowEventListeners();
    
  } catch (error) {
    console.error('[caiz] Error rendering members:', error);
    if (typeof alerts !== 'undefined') {
      alerts.error('Failed to render members');
    }
  }
}

function setupMemberRowEventListeners() {
  // Role change select handlers
  document.querySelectorAll('.member-role-select').forEach(select => {
    select.addEventListener('change', function() {
      const uid = this.getAttribute('data-uid');
      const newRole = this.value;
      if (newRole) {
        changeMemberRole(uid, newRole);
        this.value = ''; // Reset select
      }
    });
  });
  
  // Remove button handlers
  document.querySelectorAll('.member-remove-btn').forEach(button => {
    button.addEventListener('click', function() {
      const uid = this.getAttribute('data-uid');
      const username = this.getAttribute('data-username');
      removeMember(uid, username);
    });
  });
}

function filterMembers(searchTerm) {
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
}

// Username autocomplete functionality
function initializeUsernameAutocomplete(input) {
  const suggestionsContainer = document.getElementById('username-suggestions');
  let searchTimeout;
  let selectedIndex = -1;
  
  input.addEventListener('input', function(e) {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
      hideSuggestions();
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      try {
        await searchUsers(query, suggestionsContainer);
        selectedIndex = -1;
      } catch (error) {
        console.error('[caiz] Error searching users:', error);
        hideSuggestions();
      }
    }, 300);
  });
  
  input.addEventListener('keydown', function(e) {
    const suggestions = suggestionsContainer.querySelectorAll('.dropdown-item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
      updateSelection(suggestions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateSelection(suggestions);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      suggestions[selectedIndex].click();
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });
  
  input.addEventListener('blur', function() {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => hideSuggestions(), 150);
  });
  
  function updateSelection(suggestions) {
    suggestions.forEach((item, index) => {
      item.classList.toggle('active', index === selectedIndex);
    });
  }
  
  function hideSuggestions() {
    suggestionsContainer.style.display = 'none';
    suggestionsContainer.innerHTML = '';
    selectedIndex = -1;
  }
}

async function searchUsers(query, container) {
  try {
    // Use NodeBB's user search API
    const response = await fetch(`/api/users?query=${encodeURIComponent(query)}&limit=10`);
    const data = await response.json();
    
    if (!data.users || data.users.length === 0) {
      container.innerHTML = '<div class="dropdown-item-text text-muted">No users found</div>';
      container.style.display = 'block';
      return;
    }
    
    // Render using template
    const renderedSuggestions = await Promise.all(
      data.users.map(async (user) => {
        const templateData = {
          username: user.username,
          displayname: user.displayname || user.username,
          picture: user.picture,
          firstLetter: user.username.charAt(0).toUpperCase()
        };
        
        return await CommunityEditUtils.parseAndTranslate('partials/user-suggestion', templateData);
      })
    );
    
    // Update DOM with all rendered suggestions
    container.innerHTML = renderedSuggestions.join('');
    container.style.display = 'block';
    
    // Add click handlers for suggestions
    container.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const username = this.dataset.username;
        const input = document.getElementById('add-member-username');
        input.value = username;
        container.style.display = 'none';
        input.focus();
      });
    });
    
  } catch (error) {
    console.error('[caiz] Error fetching user suggestions:', error);
    container.innerHTML = '<div class="dropdown-item-text text-muted">Error loading suggestions</div>';
    container.style.display = 'block';
  }
}

// Make functions globally available
window.CommunityEditMembers = {
  initializeMemberManagement,
  loadMembers,
  renderMembers,
  initializeUsernameAutocomplete,
  searchUsers
};

// Also expose for tab switching
window.setupMemberEventHandlers = setupMemberEventHandlers;
window.loadMembers = loadMembers;