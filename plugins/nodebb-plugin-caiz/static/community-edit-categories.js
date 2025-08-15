// Community Edit Categories Management
// Handles subcategory management functionality

// Category Management Functions
async function initializeCategoryManagement(cid) {
  console.log('[caiz] Initializing category management for cid:', cid);
  currentCommunityId = cid;
  
  // Don't load categories immediately - wait for tab switch
  // Just store the cid for later use
}

function setupCategoryEventHandlers() {
  console.log('[caiz] Setting up category event handlers');
  
  // Remove existing event listeners to prevent duplicates
  const addBtn = document.getElementById('add-category-btn');
  if (addBtn) {
    // Clone to remove all event listeners
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    
    // Add fresh event listener
    newAddBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[caiz] Add category button clicked');
      showCategoryForm();
    });
  }
  
  // Cancel form buttons
  const cancelBtns = document.querySelectorAll('#cancel-category-form, #cancel-category-form-btn');
  cancelBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      hideCategoryForm();
    });
  });
  
  // Form submit
  const form = document.getElementById('category-form');
  if (form) {
    form.addEventListener('submit', handleCategoryFormSubmit);
  }
  
  // Icon selector for category form
  const iconSelectBtn = document.getElementById('category-icon-select');
  if (iconSelectBtn) {
    iconSelectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof openCategoryIconSelector === 'function') {
        openCategoryIconSelector();
      } else if (typeof CommunityEditCategoryActions !== 'undefined' && CommunityEditCategoryActions.openCategoryIconSelector) {
        CommunityEditCategoryActions.openCategoryIconSelector();
      }
    });
  }
  
  // Color change handlers
  const colorInput = document.getElementById('category-form-color');
  const bgColorInput = document.getElementById('category-form-bg-color');
  const iconElement = document.getElementById('category-selected-icon');
  
  if (colorInput && iconElement) {
    colorInput.addEventListener('input', (e) => {
      iconElement.style.color = e.target.value;
    });
  }
  
  if (bgColorInput && iconElement) {
    bgColorInput.addEventListener('input', (e) => {
      iconElement.style.backgroundColor = e.target.value;
    });
  }
}

async function loadSubCategories() {
  if (!currentCommunityId) return;
  
  try {
    console.log('[caiz] Loading subcategories for cid:', currentCommunityId);
    showCategoriesLoading();
    
    const data = await new Promise((resolve, reject) => {
      socket.emit('plugins.caiz.getSubCategories', { cid: currentCommunityId }, function(err, data) {
        if (err) reject(err);
        else resolve(data);
      });
    });
    
    // Always hide loading state
    const loadingEl = document.getElementById('categories-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    
    subcategories = data || [];
    console.log('[caiz] Loaded subcategories:', subcategories);
    await renderSubCategories();
    
  } catch (error) {
    console.error('[caiz] Error loading subcategories:', error);
    // Hide loading state on error
    const loadingEl = document.getElementById('categories-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    showCategoriesError(error.message);
  }
}

function showCategoriesLoading() {
  document.getElementById('categories-loading').style.display = 'block';
  document.getElementById('categories-empty').style.display = 'none';
  document.getElementById('categories-content').style.display = 'none';
}

function showCategoriesError(message) {
  document.getElementById('categories-loading').style.display = 'none';
  document.getElementById('categories-empty').style.display = 'none';
  document.getElementById('categories-content').style.display = 'none';
  
  // Show error message
  if (typeof alerts !== 'undefined') {
    alerts.error(`Failed to load categories: ${message}`);
  }
}

const renderSubCategories = async () => {
  const loadingEl = document.getElementById('categories-loading');
  const emptyEl = document.getElementById('categories-empty');
  const contentEl = document.getElementById('categories-content');
  const tableBody = document.getElementById('categories-table-body');
  
  loadingEl.style.display = 'none';
  
  if (!subcategories.length) {
    emptyEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }
  
  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';
  
  try {
    // Render table rows using template
    const renderedRows = await Promise.all(
      subcategories.map(async (category) => {
        // Prepare template data
        const templateData = {
          cid: category.cid,
          name: CommunityEditUtils.decodeHTMLEntities(category.name || ''),
          description: CommunityEditUtils.decodeHTMLEntities(category.description || ''),
          icon: category.icon,
          color: category.color || '#000',
          bgColor: category.bgColor || 'transparent',
          topiccount: category.topiccount || 0,
          postcount: category.postcount || 0
        };
        
        // Render template
        return await CommunityEditUtils.parseAndTranslate('partials/subcategory-row', templateData);
      })
    );
    
    // Update DOM with all rendered rows
    tableBody.innerHTML = renderedRows.join('');
    
    // Initialize drag and drop after rendering
    if (typeof CommunityEditCategoryActions !== 'undefined' && CommunityEditCategoryActions.initializeDragAndDrop) {
      CommunityEditCategoryActions.initializeDragAndDrop();
    } else if (typeof initializeDragAndDrop !== 'undefined') {
      initializeDragAndDrop();
    }
    
  } catch (error) {
    console.error('[caiz] Error rendering subcategories:', error);
    if (typeof alerts !== 'undefined') {
      alerts.error('Failed to render subcategories');
    }
  }
};

const showCategoryForm = (category = null) => {
  const container = document.getElementById('category-form-container');
  const addBtn = document.getElementById('add-category-btn');
  const title = document.getElementById('category-form-title');
  const form = document.getElementById('category-form');
  const cidInput = document.getElementById('category-form-cid');
  const nameInput = document.getElementById('category-form-name');
  const descInput = document.getElementById('category-form-description');
  const iconInput = document.getElementById('category-form-icon');
  const colorInput = document.getElementById('category-form-color');
  const bgColorInput = document.getElementById('category-form-bg-color');
  const iconElement = document.getElementById('category-selected-icon');
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.category-form-btn-text');
  
  // Hide the Add Category button when form is shown
  if (addBtn) {
    addBtn.style.display = 'none';
  }
  
  // Reset form
  form.reset();
  form.classList.remove('was-validated');
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  
  if (category) {
    // Edit mode
    title.textContent = 'Edit Category';
    btnText.textContent = 'Update Category';
    cidInput.value = category.cid;
    nameInput.value = CommunityEditUtils.decodeHTMLEntities(category.name || '');
    descInput.value = CommunityEditUtils.decodeHTMLEntities(category.description || '');
    iconInput.value = category.icon || 'fa-folder';
    colorInput.value = category.color || '#000000';
    bgColorInput.value = category.bgColor || '#ffffff';
    
    // Update icon display
    iconElement.className = `fa ${category.icon || 'fa-folder'} fa-lg`;
    iconElement.style.color = category.color || '#000000';
    iconElement.style.backgroundColor = category.bgColor || '#ffffff';
  } else {
    // Add mode
    title.textContent = 'Add Category';
    btnText.textContent = 'Add Category';
    cidInput.value = '';
    iconInput.value = 'fa-folder';
    colorInput.value = '#000000';
    bgColorInput.value = '#ffffff';
    
    // Reset icon display
    iconElement.className = 'fa fa-folder fa-lg';
    iconElement.style.color = '#000000';
    iconElement.style.backgroundColor = '#ffffff';
  }
  
  container.style.display = 'block';
  nameInput.focus();
};

const hideCategoryForm = () => {
  const container = document.getElementById('category-form-container');
  const addBtn = document.getElementById('add-category-btn');
  
  container.style.display = 'none';
  
  // Show the Add Category button again
  if (addBtn) {
    addBtn.style.display = 'block';
  }
};

const handleCategoryFormSubmit = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  
  // Get form values directly from input elements
  const cidInput = form.querySelector('#category-form-cid');
  const nameInput = form.querySelector('#category-form-name');
  const descInput = form.querySelector('#category-form-description');
  const iconInput = form.querySelector('#category-form-icon');
  const colorInput = form.querySelector('#category-form-color');
  const bgColorInput = form.querySelector('#category-form-bg-color');
  
  const cid = cidInput ? cidInput.value : '';
  const name = nameInput ? nameInput.value : '';
  const description = descInput ? descInput.value : '';
  const icon = iconInput ? iconInput.value : 'fa-folder';
  const color = colorInput ? colorInput.value : '#000000';
  const bgColor = bgColorInput ? bgColorInput.value : '#ffffff';
  
  console.log('[caiz] Form values - CID:', cid, 'Name:', name, 'Description:', description);
  console.log('[caiz] Icon:', icon, 'Color:', color, 'BgColor:', bgColor);
  
  // Validate
  if (!name || !name.trim()) {
    if (typeof CommunityEditUtils !== 'undefined' && CommunityEditUtils.showFieldError) {
      CommunityEditUtils.showFieldError(nameInput, 'Category name is required');
    }
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.category-form-btn-text');
  const btnSpinner = submitBtn.querySelector('.category-form-btn-spinner');
  
  // Show loading
  if (btnText) btnText.style.display = 'none';
  if (btnSpinner) btnSpinner.style.display = 'inline';
  if (submitBtn) submitBtn.disabled = true;
  
  try {
    const isEdit = !!(cid && cid.trim());
    const socketEvent = isEdit ? 'plugins.caiz.updateSubCategory' : 'plugins.caiz.createSubCategory';
    const requestData = {
      parentCid: currentCommunityId,
      name: name.trim(),
      description: description.trim(),
      icon: icon || 'fa-folder',
      color: color && color !== '#000000' ? color : '',
      bgColor: bgColor && bgColor !== '#ffffff' ? bgColor : ''
    };
    
    if (isEdit) {
      requestData.cid = parseInt(cid);
    }
    
    console.log('[caiz] Is edit mode:', isEdit);
    console.log('[caiz] Socket event:', socketEvent);
    console.log('[caiz] Submitting category form:', requestData);
    
    try {
      await new Promise((resolve, reject) => {
        socket.emit(socketEvent, requestData, function(err, result) {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      console.log('[caiz] Category saved successfully');
      
      if (typeof alerts !== 'undefined') {
        alerts.success(isEdit ? 'Category updated successfully' : 'Category created successfully');
      }
      
      hideCategoryForm();
      await loadSubCategories(); // Reload the list
      
    } catch (err) {
      console.error('[caiz] Error saving category:', err);
      if (typeof alerts !== 'undefined') {
        alerts.error(err.message || 'Failed to save category');
      }
    }
    
  } catch (error) {
    console.error('[caiz] Error in form submit:', error);
    if (typeof alerts !== 'undefined') {
      alerts.error(error.message || 'An error occurred');
    }
  } finally {
    // Reset loading state
    if (btnText) btnText.style.display = 'inline';
    if (btnSpinner) btnSpinner.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
};

// Make functions globally available
window.CommunityEditCategories = {
  initializeCategoryManagement,
  loadSubCategories,
  renderSubCategories,
  showCategoryForm,
  hideCategoryForm
};

// Also expose for tab switching
window.setupCategoryEventHandlers = setupCategoryEventHandlers;
window.loadSubCategories = loadSubCategories;
window.showCategoryForm = showCategoryForm;
window.hideCategoryForm = hideCategoryForm;