// Community Edit Danger Zone
// Handles community deletion functionality

// Danger Zone initialization - No ownership check needed since modal is owner-only
async function initializeDangerZone(cid) {
  console.log('[caiz] Initializing danger zone for cid:', cid);
  
  // Wait for the general tab to be available
  const checkGeneralTab = async (attempts = 0) => {
    const generalTab = document.getElementById('general-tab');
    if (generalTab) {
      // Add danger zone to the general tab
      await addDangerZoneToGeneralTab(generalTab, cid);
      return;
    }
    
    if (attempts < 20) {
      setTimeout(() => checkGeneralTab(attempts + 1), 100);
    } else {
      console.warn('[caiz] Could not find general tab for danger zone');
    }
  };
  
  await checkGeneralTab();
}

async function addDangerZoneToGeneralTab(generalTab, cid) {
  // Check if danger zone already exists
  if (generalTab.querySelector('.danger-zone')) {
    return;
  }
  
  try {
    // Load danger zone template
    const result = await CommunityEditUtils.parseAndTranslate('partials/danger-zone', {});
    
    // Check if result is a jQuery object or string
    let html = result;
    if (result && typeof result === 'object' && result.jquery) {
      // If jQuery object, get the HTML
      html = result.html ? result.html() : result[0].outerHTML;
    } else if (result && typeof result === 'object' && result[0]) {
      // If DOM element array
      html = result[0].outerHTML;
    }
    
    // Only append if we have valid HTML string
    if (typeof html === 'string') {
      generalTab.insertAdjacentHTML('beforeend', html);
      // Setup event handlers after DOM insertion
      setupDangerZoneHandlers(cid);
    } else {
      console.error('[caiz] Invalid HTML from danger zone template:', result);
    }
  } catch (error) {
    console.error('[caiz] Error loading danger zone template:', error);
  }
}

function setupDangerZoneHandlers(cid) {
  // Progressive disclosure toggle
  const toggleBtn = document.getElementById('toggle-danger-zone');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const content = document.querySelector('.danger-zone-content');
      const icon = this.querySelector('i');
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.className = 'fa fa-chevron-up';
      } else {
        content.style.display = 'none';
        icon.className = 'fa fa-chevron-down';
      }
    });
  }
  
  // Delete button handler
  const deleteBtn = document.getElementById('delete-community-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showDeleteConfirmation(cid);
    });
  }
}

async function showDeleteConfirmation(cid) {
  try {
    // Get community data for confirmation
    const data = await new Promise((resolve, reject) => {
      socket.emit('plugins.caiz.getCommunityData', { cid: cid }, function(err, data) {
        if (err) reject(err);
        else resolve(data);
      });
    });
    
    const communityName = data.name;
    
    // Load confirmation dialog template
    const html = await CommunityEditUtils.parseAndTranslate('partials/delete-confirmation', { 
      communityName: communityName 
    });
    
    if (typeof bootbox === 'undefined') {
      console.error('[caiz] Bootbox not available');
      return;
    }
    
    // Create confirmation dialog using rendered template
    bootbox.dialog({
      title: '[[caiz:danger-zone.modal-title]]',
      message: html,
      buttons: {
        cancel: {
          label: '[[global:cancel]]',
          className: 'btn-secondary'
        },
        delete: {
          label: '[[caiz:danger-zone.confirm-delete]]',
          className: 'btn-danger',
          callback: async function() {
            return await handleDeleteConfirmation(cid, communityName);
          }
        }
      },
      onEscape: true
    });
    
    // Setup real-time validation after dialog is shown
    setTimeout(() => setupDeleteValidation(communityName), 100);
    
  } catch (err) {
    console.error('[caiz] Error getting community data:', err);
    if (typeof alerts !== 'undefined') {
      alerts.error('Failed to load community data');
    }
  }
}

async function handleDeleteConfirmation(cid, communityName) {
  const typedName = document.getElementById('confirm-community-name').value;
  const understood = document.getElementById('confirm-understand').checked;
  
  if (typedName !== communityName) {
    if (typeof alerts !== 'undefined') {
      const translator = await CommunityEditUtils.getTranslate();
      translator.translate('[[caiz:danger-zone.name-mismatch]]', function(translated) {
        alerts.error(translated);
      });
    }
    return false;
  }
  
  if (!understood) {
    if (typeof alerts !== 'undefined') {
      const translator = await CommunityEditUtils.getTranslate();
      translator.translate('[[caiz:danger-zone.must-understand]]', function(translated) {
        alerts.error(translated);
      });
    }
    return false;
  }
  
  await executeDeletion(cid, communityName);
  return true;
}

function setupDeleteValidation(communityName) {
  const deleteBtn = document.querySelector('.bootbox .btn-danger');
  if (!deleteBtn) return;
  
  deleteBtn.disabled = true;
  
  function checkEnableDelete() {
    const nameInput = document.getElementById('confirm-community-name');
    const understandCheck = document.getElementById('confirm-understand');
    if (!nameInput || !understandCheck) return;
    
    const typedName = nameInput.value;
    const understood = understandCheck.checked;
    deleteBtn.disabled = !(typedName === communityName && understood);
  }
  
  const nameInput = document.getElementById('confirm-community-name');
  const understandCheck = document.getElementById('confirm-understand');
  if (nameInput) nameInput.addEventListener('input', checkEnableDelete);
  if (understandCheck) understandCheck.addEventListener('change', checkEnableDelete);
}

async function executeDeletion(cid, name) {
  // Final confirmation
  if (typeof bootbox !== 'undefined') {
    bootbox.confirm({
      title: '<span class="text-danger">[[caiz:danger-zone.final-confirm-title]]</span>',
      message: '[[caiz:danger-zone.final-confirm-message]]',
      buttons: {
        confirm: {
          label: '[[caiz:danger-zone.final-delete]]',
          className: 'btn-danger'
        },
        cancel: {
          label: '[[global:cancel]]',
          className: 'btn-secondary'
        }
      },
      callback: async function(result) {
        if (!result) {
          return;
        }
        
        // Show progress
        if (typeof alerts !== 'undefined') {
          const translator = await CommunityEditUtils.getTranslate();
          translator.translate('[[caiz:danger-zone.deleting]]', function(deleting) {
            translator.translate('[[caiz:danger-zone.deleting-message]]', function(deletingMessage) {
              alerts.info(deleting, deletingMessage);
            });
          });
        }
        
        // Execute deletion
        try {
          await new Promise((resolve, reject) => {
            socket.emit('plugins.caiz.deleteCommunity', { cid: cid }, function(err, response) {
              if (err) reject(err);
              else resolve(response);
            });
          });
          
          if (typeof alerts !== 'undefined') {
            const translator = await CommunityEditUtils.getTranslate();
            translator.translate('[[caiz:danger-zone.delete-success]]', function(deleteSuccess) {
              alerts.success(deleteSuccess);
            });
          }
          
          // Redirect to home page after deletion
          setTimeout(function() {
            window.location.href = '/';
          }, 2000);
          
        } catch (err) {
          console.error('[caiz] Error deleting community:', err);
          if (typeof alerts !== 'undefined') {
            const translator = await CommunityEditUtils.getTranslate();
            translator.translate('[[caiz:danger-zone.delete-error]]', function(deleteError) {
              alerts.error(err.message || deleteError);
            });
          }
        }
      }
    });
    
  }
}

// Make functions globally available
window.CommunityEditDanger = {
  initializeDangerZone,
  addDangerZoneToGeneralTab,
  setupDangerZoneHandlers,
  showDeleteConfirmation,
  executeDeletion
};