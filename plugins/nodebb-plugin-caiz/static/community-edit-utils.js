// Community Edit Utilities
// Shared utility functions for community edit functionality

// Utility function to decode HTML entities
const decodeHTMLEntities = (text) => {
  if (!text) return text;
  
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

function escapeHtml(text) {
  if (!text) return '';
  // First decode any existing HTML entities, then escape properly
  const div = document.createElement('div');
  div.innerHTML = text;
  const decodedText = div.textContent || div.innerText || '';
  div.textContent = decodedText;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(parseInt(timestamp));
  return date.toLocaleDateString();
}

function getRoleClass(role) {
  const classes = {
    owner: 'bg-danger',
    manager: 'bg-warning text-dark',
    member: 'bg-primary',
    banned: 'bg-dark'
  };
  return classes[role] || 'bg-secondary';
}

function getRoleDisplayName(role) {
  // Return translation key for proper localization
  const translationKeys = {
    owner: '[[caiz:owner]]',
    manager: '[[caiz:manager]]',
    member: '[[caiz:member]]',
    banned: '[[caiz:banned]]'
  };
  return translationKeys[role] || role;
}

function canManageMember(member) {
  if (!currentUserRole) return false;
  
  // Special case: owners can demote themselves if there are other owners
  if (member.uid == app.user.uid && currentUserRole === 'owner' && member.role === 'owner') {
    return true; // Allow self-management for owners (backend will validate multiple owners exist)
  }
  
  // Generally can't manage yourself
  if (member.uid == app.user.uid) return false;
  
  // Owners can manage everyone
  if (currentUserRole === 'owner') return true;
  
  // Managers can manage members and banned users
  if (currentUserRole === 'manager') {
    return member.role === 'member' || member.role === 'banned';
  }
  
  return false;
}

function getRoleOptions(currentRole, memberUid) {
  const options = [];
  const isCurrentUser = memberUid == app.user.uid;
  
  if (currentUserRole === 'owner') {
    if (isCurrentUser && currentRole === 'owner') {
      // Special case: if current user is owner, only show demote options
      // (backend will check if there are other owners before allowing this)
      options.push({ value: 'manager', key: '[[caiz:demote-to-manager]]' });
      options.push({ value: 'member', key: '[[caiz:demote-to-member]]' });
    } else {
      // For other users
      if (currentRole !== 'owner') options.push({ value: 'owner', key: '[[caiz:promote-to-owner]]' });
      if (currentRole !== 'manager') options.push({ value: 'manager', key: '[[caiz:promote-to-manager]]' });
      if (currentRole !== 'member') options.push({ value: 'member', key: '[[caiz:member]]' });
      
      // For banned role, exclude current user (owners cannot ban themselves)
      if (currentRole !== 'banned') options.push({ value: 'banned', key: '[[caiz:ban-user]]' });
    }
  } else if (currentUserRole === 'manager') {
    if (currentRole !== 'member') options.push({ value: 'member', key: '[[caiz:member]]' });
    if (currentRole !== 'banned' && !isCurrentUser) options.push({ value: 'banned', key: '[[caiz:ban-user]]' });
  }
  
  return options;
}

// Async utility functions for getting NodeBB modules
function getCommunityAlert() {
  return new Promise((resolve) => {
    if (typeof alerts !== 'undefined') {
      resolve({ alert: alerts });
    } else {
      require(['alerts'], function(alerts) {
        resolve({ alert: alerts });
      });
    }
  });
}

function getCommunityTranslate() {
  return new Promise((resolve) => {
    if (typeof translator !== 'undefined') {
      resolve(translator);
    } else {
      require(['translator'], function(translator) {
        resolve(translator);
      });
    }
  });
}

function showFieldError(field, message) {
  field.classList.add('is-invalid');
  const feedback = field.parentNode.querySelector('.invalid-feedback');
  if (feedback) {
    feedback.textContent = message;
  }
}

function clearFieldError(field) {
  field.classList.remove('is-invalid');
}

// Promise-based wrapper for app.parseAndTranslate
function parseAndTranslate(template, data = {}) {
  return new Promise((resolve, reject) => {
    app.parseAndTranslate(template, data, function(result) {
      // app.parseAndTranslate can return either HTML string or jQuery object
      if (typeof result === 'string') {
        resolve(result);
      } else if (result && typeof result === 'object') {
        // Handle jQuery object
        if (result.jquery) {
          // jQuery object - get outer HTML
          const html = result[0] ? result[0].outerHTML : '';
          resolve(html);
        } else if (result instanceof Element) {
          // DOM Element
          resolve(result.outerHTML);
        } else if (result[0] instanceof Element) {
          // Array of DOM Elements
          resolve(result[0].outerHTML);
        } else {
          console.error('[caiz] parseAndTranslate returned unexpected object:', result);
          reject(new Error('Invalid HTML returned'));
        }
      } else {
        console.error('[caiz] parseAndTranslate returned unexpected type:', result);
        reject(new Error('Invalid HTML returned'));
      }
    });
  });
}

// Make functions globally available
window.CommunityEditUtils = {
  decodeHTMLEntities,
  escapeHtml,
  formatDate,
  getRoleClass,
  getRoleDisplayName,
  canManageMember,
  getRoleOptions,
  getAlert: getCommunityAlert,
  getTranslate: getCommunityTranslate,
  showFieldError,
  clearFieldError,
  parseAndTranslate
};