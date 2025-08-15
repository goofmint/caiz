// Community Edit Category Actions
// Handles category CRUD operations and drag & drop

function editCategory(cid) {
  console.log('[caiz] Edit category called for cid:', cid);
  console.log('[caiz] Available subcategories:', subcategories);
  
  const category = subcategories.find(cat => cat.cid == cid);
  if (category) {
    console.log('[caiz] Found category:', category);
    // Use global function directly
    if (typeof showCategoryForm === 'function') {
      showCategoryForm(category);
    } else if (typeof CommunityEditCategories !== 'undefined' && CommunityEditCategories.showCategoryForm) {
      CommunityEditCategories.showCategoryForm(category);
    } else {
      console.error('[caiz] showCategoryForm function not found');
    }
  } else {
    console.error('[caiz] Category not found for cid:', cid);
  }
}

function deleteCategory(cid, name) {
  const decodedName = CommunityEditUtils.decodeHTMLEntities(name || '');
  
  // Use translator for confirmation message
  require(['translator'], function(translator) {
    translator.translate('[[caiz:categories.delete-confirm]]', {
      name: decodedName
    }, function(confirmMessage) {
      
      if (typeof bootbox !== 'undefined') {
        bootbox.confirm({
          title: '[[caiz:categories.delete-title]]',
          message: confirmMessage,
          buttons: {
            confirm: {
              label: '<i class="fa fa-trash"></i> [[global:delete]]',
              className: 'btn-danger'
            },
            cancel: {
              label: '[[global:cancel]]',
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
        if (confirm(confirmMessage)) {
          performDeleteCategory(cid);
        }
      }
    });
  });
}

const performDeleteCategory = async (cid) => {
  try {
    await new Promise((resolve, reject) => {
      socket.emit('plugins.caiz.deleteSubCategory', {
        cid: cid,
        parentCid: currentCommunityId
      }, function(err, result) {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log('[caiz] Category deleted successfully');
    
    if (typeof alerts !== 'undefined') {
      const translator = await CommunityEditUtils.getTranslate();
      translator.translate('[[caiz:categories.delete-success]]', function(translated) {
        alerts.success(translated);
      });
    }
    
    await CommunityEditCategories.loadSubCategories(); // Reload the list
    
  } catch (err) {
    console.error('[caiz] Error deleting category:', err);
    if (typeof alerts !== 'undefined') {
      const translator = await CommunityEditUtils.getTranslate();
      translator.translate('[[caiz:categories.delete-error]]', function(translated) {
        alerts.error(err.message || translated);
      });
    }
  }
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

// Drag and Drop functionality
function initializeDragAndDrop() {
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
}

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

const updateCategoryOrder = async () => {
  const tableBody = document.getElementById('categories-table-body');
  if (!tableBody) return;
  
  const rows = tableBody.querySelectorAll('.category-row');
  const newOrder = Array.from(rows).map(row => parseInt(row.dataset.cid));
  
  console.log('[caiz] New category order:', newOrder);
  
  try {
    // Send to server
    await new Promise((resolve, reject) => {
      socket.emit('plugins.caiz.reorderSubCategories', {
        parentCid: currentCommunityId,
        categoryIds: newOrder
      }, function(err, result) {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log('[caiz] Categories reordered successfully');
    
    if (typeof alerts !== 'undefined') {
      const translator = await CommunityEditUtils.getTranslate();
      translator.translate('[[caiz:categories.reorder-success]]', function(translated) {
        alerts.success(translated);
      });
    }
    
    // Wait a moment before reloading to ensure database update is complete
    setTimeout(async () => {
      await CommunityEditCategories.loadSubCategories();
    }, 500);
    
  } catch (err) {
    console.error('[caiz] Error reordering categories:', err);
    if (typeof alerts !== 'undefined') {
      const translator = await CommunityEditUtils.getTranslate();
      translator.translate('[[caiz:categories.reorder-error]]', function(translated) {
        alerts.error(err.message || translated);
      });
    }
    // Reload to restore original order
    await CommunityEditCategories.loadSubCategories();
  }
};

// Make functions globally available for onclick handlers
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;

// Make functions available in namespace
window.CommunityEditCategoryActions = {
  editCategory,
  deleteCategory,
  openCategoryIconSelector,
  initializeDragAndDrop,
  updateCategoryOrder
};

// Also expose globally for categories.js
window.initializeDragAndDrop = initializeDragAndDrop;