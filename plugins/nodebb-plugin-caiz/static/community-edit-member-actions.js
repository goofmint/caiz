// Community Edit Member Actions
// Handles member CRUD operations

function showAddMemberForm() {
  const container = document.getElementById('add-member-form-container');
  const input = document.getElementById('add-member-username');
  
  if (container) {
    container.style.display = 'block';
  }
  if (input) {
    input.focus();
  }
}

function hideAddMemberForm() {
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
}

async function handleAddMemberSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const username = formData.get('username');
  
  // Validate
  if (!username || !username.trim()) {
    CommunityEditUtils.showFieldError(form.querySelector('#add-member-username'), 'Username is required');
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

function changeMemberRole(targetUid, newRole) {
  if (!newRole) return;
  
  const member = currentMembers.find(m => m.uid == targetUid);
  if (!member) return;
  
  // Use translator for confirmation message
  require(['translator'], function(translator) {
    const roleDisplayName = CommunityEditUtils.getRoleDisplayName(newRole);
    
    translator.translate('[[caiz:members.change-role-confirm]]', {
      username: member.username,
      role: roleDisplayName
    }, function(confirmMessage) {
      
      if (typeof bootbox !== 'undefined') {
        bootbox.confirm({
          title: '[[caiz:members.change-role]]',
          message: confirmMessage,
          buttons: {
            confirm: {
              label: '<i class="fa fa-check"></i> [[global:confirm]]',
              className: 'btn-primary'
            },
            cancel: {
              label: '[[global:cancel]]',
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
    });
  });
}

function performRoleChange(targetUid, newRole) {
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
    
    CommunityEditMembers.loadMembers(); // Reload the list
  });
}

function removeMember(targetUid, username) {
  const decodedUsername = CommunityEditUtils.decodeHTMLEntities(username || '');
  
  // Use translator for confirmation message
  require(['translator'], function(translator) {
    translator.translate('[[caiz:members.remove-member-confirm]]', {
      username: decodedUsername
    }, function(confirmMessage) {
      
      if (typeof bootbox !== 'undefined') {
        bootbox.confirm({
          title: '[[caiz:members.remove-member-title]]',
          message: confirmMessage,
          buttons: {
            confirm: {
              label: '<i class="fa fa-trash"></i> [[caiz:members.remove]]',
              className: 'btn-danger'
            },
            cancel: {
              label: '[[global:cancel]]',
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
    });
  });
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