// Community Edit Member Actions
// Handles member CRUD operations

// Helper function to translate text 
function translateText(key, data = null) {
  return new Promise((resolve) => {
    require(['translator'], function(translator) {
      console.log('[caiz] DEBUG: Translating key:', key, 'with data:', data);
      
      translator.translate(key, function(translated) {
        let result = translated;
        
        // Handle manual replacement for object data
        if (data && typeof data === 'object') {
          Object.keys(data).forEach(dataKey => {
            result = result.replace(new RegExp(`\\{${dataKey}\\}`, 'g'), data[dataKey]);
          });
        }
        
        console.log('[caiz] DEBUG: Translation result:', key, '->', result);
        resolve(result);
      });
    });
  });
}

function showAddMemberForm() {
  const container = document.getElementById('member-form-container');
  const addBtn = document.getElementById('add-member-btn');
  const input = document.getElementById('add-member-username');
  
  console.log('[caiz] Showing add member form');
  console.log('[caiz] Container:', container);
  console.log('[caiz] Add button:', addBtn);
  console.log('[caiz] Input:', input);
  
  // Hide the Add Member button when form is shown
  if (addBtn) {
    addBtn.style.display = 'none';
  }
  
  if (container) {
    container.style.display = 'block';
  }
  if (input) {
    input.focus();
  }
}

function hideAddMemberForm() {
  const container = document.getElementById('member-form-container');
  const addBtn = document.getElementById('add-member-btn');
  const form = document.getElementById('member-form');
  
  if (container) {
    container.style.display = 'none';
  }
  
  // Show the Add Member button again
  if (addBtn) {
    addBtn.style.display = 'block';
  }
  
  if (form) {
    form.reset();
    form.classList.remove('was-validated');
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }
}

async function handleAddMemberSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const usernameInput = form.querySelector('#add-member-username');
  const roleSelect = form.querySelector('#member-role');
  const username = usernameInput ? usernameInput.value : '';
  const role = roleSelect ? roleSelect.value : 'member';
  
  console.log('[caiz] Submitting add member form, username:', username, 'role:', role);
  
  // Validate
  if (!username || !username.trim()) {
    if (typeof CommunityEditUtils !== 'undefined' && CommunityEditUtils.showFieldError) {
      CommunityEditUtils.showFieldError(usernameInput, 'Username is required');
    }
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.member-form-btn-text');
  const btnSpinner = submitBtn.querySelector('.member-form-btn-spinner');
  
  // Show loading
  if (btnText) btnText.style.display = 'none';
  if (btnSpinner) btnSpinner.style.display = 'inline';
  submitBtn.disabled = true;
  
  try {
    console.log('[caiz] Adding member:', username.trim());
    
    socket.emit('plugins.caiz.addMember', {
      cid: currentCommunityId,
      username: username.trim(),
      role: role
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
      CommunityEditMembers.loadMembers(); // Reload the list
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
}

async function changeMemberRole(targetUid, newRole) {
  if (!newRole) return;
  
  const member = currentMembers.find(m => m.uid == targetUid);
  if (!member) return;
  
  try {
    // Get role display name first
    const roleDisplayNameKey = CommunityEditUtils.getRoleDisplayName(newRole);
    const roleDisplayName = await translateText(roleDisplayNameKey);
    
    // Get all other translations in parallel using app.parseAndTranslate
    const [titleText, confirmText, cancelText, confirmMessage] = await Promise.all([
      translateText('[[caiz:change-role]]'),
      translateText('[[global:confirm]]'),
      translateText('[[global:cancel]]'),
      translateText('[[caiz:change-role-confirm]]', {
        username: member.username,
        role: roleDisplayName
      })
    ]);
    
    if (typeof bootbox !== 'undefined') {
      bootbox.confirm({
        title: titleText,
        message: confirmMessage,
        buttons: {
          confirm: {
            label: '<i class="fa fa-check"></i> ' + confirmText,
            className: 'btn-primary'
          },
          cancel: {
            label: cancelText,
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
  } catch (error) {
    console.error('[caiz] Error in changeMemberRole:', error);
  }
}

function performRoleChange(targetUid, newRole) {
  socket.emit('plugins.caiz.changeMemberRole', {
    cid: currentCommunityId,
    targetUid: targetUid,
    newRole: newRole
  }, function(err, result) {
    if (err) {
      console.error('[caiz] Error changing member role:', err);
      require(['alerts', 'translator'], function(alerts, translator) {
        translator.translate(err.message || '[[caiz:error.change-role-failed]]', function(translated) {
          alerts.error(translated);
        });
      });
      return;
    }
    
    console.log('[caiz] Member role changed successfully');
    
    require(['alerts', 'translator'], function(alerts, translator) {
      translator.translate('[[caiz:success.role-updated]]', function(translated) {
        alerts.success(translated);
      });
    });
    
    CommunityEditMembers.loadMembers(); // Reload the list
  });
}

async function removeMember(targetUid, username) {
  const decodedUsername = CommunityEditUtils.decodeHTMLEntities(username || '');
  
  try {
    console.log('[caiz] DEBUG: Starting translation for removeMember');
    
    // Get all translations in parallel using app.parseAndTranslate
    const [titleText, removeText, cancelText, confirmMessage] = await Promise.all([
      translateText('[[caiz:remove-member-title]]'),
      translateText('[[caiz:remove]]'),
      translateText('[[global:cancel]]'),
      translateText('[[caiz:remove-member-confirm]]', {
        username: decodedUsername
      })
    ]);
    
    if (typeof bootbox !== 'undefined') {
      bootbox.confirm({
        title: titleText,
        message: confirmMessage,
        buttons: {
          confirm: {
            label: '<i class="fa fa-trash"></i> ' + removeText,
            className: 'btn-danger'
          },
          cancel: {
            label: cancelText,
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
      if (confirm(confirmMessage)) {
        performRemoveMember(targetUid);
      }
    }
  } catch (error) {
    console.error('[caiz] Error in removeMember:', error);
  }
}

function performRemoveMember(targetUid) {
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
    
    CommunityEditMembers.loadMembers(); // Reload the list
  });
}

// Make functions globally available for onclick handlers
window.changeMemberRole = changeMemberRole;
window.removeMember = removeMember;

// Make functions available in namespace
window.CommunityEditMemberActions = {
  showAddMemberForm,
  hideAddMemberForm,
  handleAddMemberSubmit,
  changeMemberRole,
  removeMember,
  performRoleChange,
  performRemoveMember
};