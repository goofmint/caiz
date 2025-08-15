// Community Edit Form Utilities
// Form validation and setup functions

// Setup logo type toggle (icon vs image)
function setupLogoTypeToggle() {
  const iconRadio = document.getElementById('logo-type-icon');
  const imageRadio = document.getElementById('logo-type-image');
  const iconGroup = document.getElementById('icon-selector-group');
  const imageGroup = document.getElementById('image-uploader-group');
  
  if (!iconRadio || !imageRadio || !iconGroup || !imageGroup) {
    console.error('[caiz] Logo type toggle elements not found');
    return;
  }
  
  iconRadio.addEventListener('change', () => {
    if (iconRadio.checked) {
      iconGroup.style.display = 'block';
      imageGroup.style.display = 'none';
      console.log('[caiz] Switched to icon mode');
    }
  });
  
  imageRadio.addEventListener('change', () => {
    if (imageRadio.checked) {
      iconGroup.style.display = 'none';
      imageGroup.style.display = 'block';
      console.log('[caiz] Switched to image mode');
    }
  });
}

// Setup icon color pickers
function setupIconColorPickers() {
  const iconColorInput = document.getElementById('icon-color');
  const bgColorInput = document.getElementById('icon-bg-color');
  const selectedIcon = document.getElementById('selected-icon');
  const iconPreview = document.getElementById('selected-icon-preview');
  const resetIconColor = document.getElementById('reset-icon-color');
  const resetBgColor = document.getElementById('reset-bg-color');
  
  if (!iconColorInput || !bgColorInput || !selectedIcon || !iconPreview) {
    console.error('[caiz] Color picker elements not found');
    return;
  }
  
  // Icon color change
  iconColorInput.addEventListener('input', (e) => {
    selectedIcon.style.color = e.target.value;
    console.log('[caiz] Icon color changed to:', e.target.value);
  });
  
  // Background color change
  bgColorInput.addEventListener('input', (e) => {
    iconPreview.style.background = e.target.value;
    console.log('[caiz] Background color changed to:', e.target.value);
  });
  
  // Reset icon color
  if (resetIconColor) {
    resetIconColor.addEventListener('click', () => {
      iconColorInput.value = '#000000';
      selectedIcon.style.color = '#000000';
      console.log('[caiz] Icon color reset to default');
    });
  }
  
  // Reset background color
  if (resetBgColor) {
    resetBgColor.addEventListener('click', () => {
      bgColorInput.value = '#f8f9fa';
      iconPreview.style.background = '#f8f9fa';
      console.log('[caiz] Background color reset to default');
    });
  }
}

// Setup icon selector using NodeBB's iconSelect module
function setupIconSelector() {
  const selectBtn = document.getElementById('icon-select-btn');
  const selectedIcon = document.getElementById('selected-icon');
  const iconInput = document.getElementById('community-icon');
  
  if (!selectBtn || !selectedIcon || !iconInput) {
    console.error('[caiz] Icon selector elements not found');
    return;
  }
  
  selectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[caiz] Opening icon selector');
    
    // Use NodeBB's iconSelect module if available
    if (typeof require !== 'undefined') {
      require(['iconSelect'], function(iconSelect) {
        // onModified callback receives: (element, icon, styles)
        iconSelect.init($(selectedIcon), function(element, icon, styles) {
          console.log('[caiz] Icon selected:', icon, 'Styles:', styles);
          
          if (!icon) {
            console.log('[caiz] No icon selected');
            return;
          }
          
          // Update the icon preview
          selectedIcon.className = '';
          // Build the full class string
          let fullClass = 'fa fa-2x';
          if (icon) {
            fullClass += ' ' + icon;
          }
          if (styles && styles.length > 0) {
            fullClass += ' ' + styles.join(' ');
          }
          selectedIcon.className = fullClass;
          
          // Store just the icon name without "fa-" prefix for database
          iconInput.value = icon;
          
          console.log('[caiz] Icon value set to:', icon);
          console.log('[caiz] Full class:', fullClass);
        });
      });
    } else {
      console.error('[caiz] NodeBB require not available, cannot load iconSelect module');
      // Fallback: show a simple alert
      if (typeof alerts !== 'undefined') {
        alerts.error('Icon selector not available');
      }
    }
  });
}

const uploadFile = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      console.log('[caiz] No file provided to uploadFile');
      resolve(null);
      return;
    }
    
    console.log('[caiz] Starting file upload for:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const formData = new FormData();
    formData.append('files[]', file);
    
    // Use NodeBB's file upload endpoint
    console.log('[caiz] Sending request to /api/post/upload');
    
    // Get CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                     document.querySelector('input[name="_csrf"]')?.value ||
                     window.config?.csrf_token;
    
    const headers = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Add CSRF token if available
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
      console.log('[caiz] Adding CSRF token to upload request');
    } else {
      console.warn('[caiz] No CSRF token found - upload might fail');
    }
    
    fetch('/api/post/upload', {
      method: 'POST',
      body: formData,
      headers: headers
    })
    .then(response => {
      console.log('[caiz] Upload response status:', response.status);
      console.log('[caiz] Upload response headers:', response.headers);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('[caiz] Upload response data:', data);
      
      // Handle NodeBB's response format: { response: { images: [...] } } or direct array
      let imageUrl = null;
      
      if (data && data.response && data.response.images && data.response.images.length > 0) {
        // NodeBB format: { response: { images: [{url: "..."}] } }
        imageUrl = data.response.images[0].url;
        console.log('[caiz] Found URL in response.images:', imageUrl);
      } else if (data && Array.isArray(data) && data.length > 0 && data[0].url) {
        // Direct array format: [{url: "..."}]
        imageUrl = data[0].url;
        console.log('[caiz] Found URL in direct array:', imageUrl);
      } else {
        console.error('[caiz] Upload failed - no URL in response:', data);
        reject(new Error('File upload failed - no URL returned'));
        return;
      }
      
      console.log('[caiz] Upload successful, URL:', imageUrl);
      resolve(imageUrl);
    })
    .catch(error => {
      console.error('[caiz] File upload error:', error);
      console.error('[caiz] Error stack:', error.stack);
      reject(new Error(`File upload failed: ${error.message}`));
    });
  });
};

function validateForm() {
  const bootboxModal = document.querySelector('.bootbox.show, .bootbox.in, .modal.show');
  if (!bootboxModal) {
    console.error('[caiz] No bootbox modal found for validation');
    return false;
  }
  
  const form = bootboxModal.querySelector('#community-edit-form, form');
  if (!form) {
    console.error('[caiz] No form found in bootbox modal');
    return false;
  }
  
  let isValid = true;
  
  // Name validation
  const nameField = bootboxModal.querySelector('#community-name, input[name="name"]');
  console.log('[caiz] Validating name field:', nameField);
  console.log('[caiz] Name field value:', nameField ? nameField.value : 'field not found');
  
  if (!nameField) {
    console.error('[caiz] Name field not found during validation');
    isValid = false;
  } else if (!nameField.value.trim()) {
    CommunityEditUtils.showFieldError(nameField, 'Community name is required');
    console.log('[caiz] Name validation failed: empty value');
    isValid = false;
  } else {
    CommunityEditUtils.clearFieldError(nameField);
    console.log('[caiz] Name validation passed');
  }
  
  console.log('[caiz] Form validation result:', isValid);
  return isValid;
}

// Make functions globally available
window.CommunityEditFormUtils = {
  setupLogoTypeToggle,
  setupIconColorPickers,
  setupIconSelector,
  uploadFile,
  validateForm
};