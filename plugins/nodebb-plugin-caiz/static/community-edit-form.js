// Community Edit Form Management
// Handles community basic information editing

// Community Edit Form Functions
async function loadCommunityEditData(cid) {
  return new Promise((resolve, reject) => {
    socket.emit('plugins.caiz.getCommunityData', { cid }, function(err, data) {
      if (err) {
        console.error('[caiz] Error loading community data:', err);
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

async function saveCommunityData(cid, formData) {
  return new Promise((resolve, reject) => {
    const data = {
      cid: cid,
      name: formData.name,
      description: formData.description
    };
    
    // Include backgroundImage if provided
    if (formData.backgroundImage !== undefined) {
      data.backgroundImage = formData.backgroundImage;
    }
    
    // Include icon if provided
    if (formData.icon !== undefined) {
      data.icon = formData.icon;
    }
    
    // Include colors if provided
    if (formData.color !== undefined) {
      data.color = formData.color;
    }
    
    if (formData.bgColor !== undefined) {
      data.bgColor = formData.bgColor;
    }
    
    console.log('[caiz] Sending data to server:', data);
    
    socket.emit('plugins.caiz.updateCommunityData', data, function(err, result) {
      if (err) {
        console.error('[caiz] Error saving community data:', err);
        reject(err);
        return;
      }
      console.log('[caiz] Save result:', result);
      resolve(result);
    });
  });
}

function initializeCommunityEditForm(cid) {
  console.log('[caiz] Initializing community edit form for cid:', cid);
  
  // Wait for form to be available in DOM
  // Track initial consent markdown across handlers to prevent unnecessary updates
  let initialConsentMarkdown = null;

  const waitForForm = (callback, attempts = 0) => {
    const form = document.getElementById('community-edit-form');
    if (form) {
      callback();
    } else if (attempts < 20) {
      setTimeout(() => waitForForm(callback, attempts + 1), 100);
    } else {
      console.error('[caiz] Community edit form not found after waiting');
    }
  };
  
  waitForForm(async () => {
    const form = document.getElementById('community-edit-form');
    console.log('[caiz] Form found, loading data');
    
    // Setup logo type toggle functionality
    setupLogoTypeToggle();
    
    // Setup icon selector
    setupIconSelector();
    
    // Setup icon color pickers
    setupIconColorPickers();
    
    // Initialize category management
    await CommunityEditCategories.initializeCategoryManagement(cid);
    
    // Initialize member management
    CommunityEditMembers.initializeMemberManagement(cid);
    
    // Initialize danger zone for community deletion (no ownership check needed - modal is owner-only)
    await CommunityEditDanger.initializeDangerZone(cid);
    
    // Load existing data
    loadCommunityEditData(cid).then(data => {
      console.log('[caiz] Loaded community data:', data);
      
      // Wait a bit more to ensure form fields are fully rendered
      setTimeout(() => {
        // Find form fields directly - no need to look for bootbox
        const modal = document.getElementById('community-edit-modal');
        if (!modal) {
          console.error('[caiz] Community edit modal not found');
          return;
        }
        
        console.log('[caiz] Found community edit modal:', modal);
        
        // Find form fields within the modal
        let nameField = modal.querySelector('#community-name');
        let descField = modal.querySelector('#community-description');
        
        console.log('[caiz] Name field found:', !!nameField);
        console.log('[caiz] Desc field found:', !!descField);
        
        // Debug DOM structure
        const allInputs = document.querySelectorAll('input, textarea');
        console.log('[caiz] All inputs/textareas in DOM:', Array.from(allInputs).map(el => ({
          id: el.id,
          name: el.name,
          type: el.type,
          tagName: el.tagName
        })));
        
        if (nameField) {
          const decodedName = (window.CommunityEditUtils && CommunityEditUtils.decodeHTMLEntities) ? CommunityEditUtils.decodeHTMLEntities(data.name || '') : (data.name || '');
          nameField.value = decodedName;
          console.log('[caiz] Set community name:', data.name, 'Field value:', nameField.value);
          // Force a change event to make sure it's visible
          nameField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (descField) {
          const decodedDesc = (window.CommunityEditUtils && CommunityEditUtils.decodeHTMLEntities) ? CommunityEditUtils.decodeHTMLEntities(data.description || '') : (data.description || '');
          descField.value = decodedDesc;
          console.log('[caiz] Set community description:', data.description, 'Field value:', descField.value);
          // Force a change event to make sure it's visible
          descField.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Load consent rule into form if exists
        try {
          const mField = modal.querySelector('#community-consent-markdown');
          if (window.socket && mField) {
            const determineLocale = () => {
              const htmlLang = (document.documentElement && document.documentElement.getAttribute('lang')) || '';
              if (htmlLang && htmlLang.trim()) return htmlLang.trim();
              if (window.config && window.config.userLang) return window.config.userLang;
              if (window.app && app.user && app.user.userLang) return app.user.userLang;
              throw new Error('[[caiz:error.consent.invalid-params]]');
            };
            const locale = determineLocale();
            window.socket.emit('plugins.caiz.getConsentRule', { cid, locale }, function (err, rule) {
              if (err) {
                console.warn('[caiz] getConsentRule error:', err);
                return;
              }
              if (rule && typeof rule.markdown === 'string') {
                mField.value = rule.markdown;
                initialConsentMarkdown = rule.markdown;
                mField.dispatchEvent(new Event('input', { bubbles: true }));
              }
            });
          }
        } catch (e) {
          console.warn('[caiz] consent rule load failed:', e);
        }
        
        // Determine whether to show icon or image
        if (data.backgroundImage) {
          // Switch to image mode
          const imageRadio = modal.querySelector('#logo-type-image');
          if (imageRadio) {
            imageRadio.checked = true;
            imageRadio.dispatchEvent(new Event('change'));
          }
          
          const currentLogoPreview = modal.querySelector('#current-logo-preview');
          const currentLogoImg = modal.querySelector('#current-logo-img');
          if (currentLogoImg && currentLogoPreview) {
            // Decode HTML entities in URL
            const decodedUrl = CommunityEditUtils.decodeHTMLEntities(data.backgroundImage);
            currentLogoImg.src = decodedUrl;
            currentLogoPreview.style.display = 'block';
            console.log('[caiz] Set current logo:', decodedUrl);
          }
        } else if (data.icon) {
          // Switch to icon mode (already default)
          const selectedIcon = modal.querySelector('#selected-icon');
          const iconInput = modal.querySelector('#community-icon');
          const iconColorInput = modal.querySelector('#icon-color');
          const bgColorInput = modal.querySelector('#icon-bg-color');
          const iconPreview = modal.querySelector('#selected-icon-preview');
          
          if (selectedIcon && iconInput) {
            // Set the current icon
            selectedIcon.className = '';
            selectedIcon.className = `fa ${data.icon} fa-2x`;
            iconInput.value = data.icon;
            console.log('[caiz] Set current icon:', data.icon);
            
            // Set colors if available
            if (data.color && iconColorInput) {
              iconColorInput.value = data.color;
              selectedIcon.style.color = data.color;
              console.log('[caiz] Set icon color:', data.color);
            }
            
            if (data.bgColor && bgColorInput && iconPreview) {
              bgColorInput.value = data.bgColor;
              iconPreview.style.background = data.bgColor;
              console.log('[caiz] Set background color:', data.bgColor);
            }
          }
        }
      }, 200);
    }).catch(err => {
      console.error('[caiz] Failed to load community data:', err);
      // Show error notification if available
      if (typeof alerts !== 'undefined') {
        alerts.error('Failed to load community data');
      }
    });
    
    // Setup file input change handler for logo preview
    setTimeout(() => {
      const modal = document.getElementById('community-edit-modal');
      if (!modal) {
        console.error('[caiz] No modal found for event handlers');
        return;
      }
      
      const logoInput = modal.querySelector('#community-logo');
      if (logoInput) {
        logoInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const newLogoPreview = modal.querySelector('#new-logo-preview');
              const newLogoImg = modal.querySelector('#new-logo-img');
              if (newLogoPreview && newLogoImg) {
                newLogoImg.src = e.target.result;
                newLogoPreview.style.display = 'block';
              }
            };
            reader.readAsDataURL(file);
          } else {
            const newLogoPreview = modal.querySelector('#new-logo-preview');
            if (newLogoPreview) {
              newLogoPreview.style.display = 'none';
            }
          }
        });
      }
      
      // Form validation on input
      const form = modal.querySelector('#community-edit-form');
      if (form) {
        form.addEventListener('input', () => validateForm());
        
        // Form submission
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          console.log('[caiz] Form submitted');
          
          if (!validateForm()) {
            console.log('[caiz] Form validation failed');
            return;
          }
          
          // Show loading state
          const submitBtn = form.querySelector('button[type="submit"]');
          const btnText = submitBtn.querySelector('.btn-text');
          const btnSpinner = submitBtn.querySelector('.btn-spinner');
          
          btnText.style.display = 'none';
          btnSpinner.style.display = 'inline';
          submitBtn.disabled = true;
          
          try {
            let backgroundImage = null;
            let icon = null;
            
            // Check which mode is selected
            const imageRadio = modal.querySelector('#logo-type-image');
            const isImageMode = imageRadio && imageRadio.checked;
            
            if (isImageMode) {
              // Handle file upload if a file was selected
              const logoFileInput = modal.querySelector('#community-logo');
              const logoFile = logoFileInput ? logoFileInput.files[0] : null;
              if (logoFile) {
              try {
                console.log('[caiz] Uploading logo file:', logoFile.name);
                backgroundImage = await uploadFile(logoFile);
                console.log('[caiz] Logo uploaded successfully:', backgroundImage);
              } catch (uploadError) {
                console.error('[caiz] Logo upload failed:', uploadError);
                console.error('[caiz] Logo upload error details:', uploadError.stack);
                
                if (typeof alerts !== 'undefined') {
                  alerts.error(`Logo upload failed: ${uploadError.message}. Please check console for details.`);
                }
                
                // For debugging purposes, throw the error instead of continuing
                // This will keep the modal open and show detailed error information
                throw new Error(`Logo upload failed: ${uploadError.message}`);
              }
              }
            } else {
              // Get selected icon and colors
              const iconInput = modal.querySelector('#community-icon');
              icon = iconInput ? iconInput.value : null;
              console.log('[caiz] Using icon:', icon);
            }
            
            const nameFieldSubmit = modal.querySelector('#community-name');
            const descFieldSubmit = modal.querySelector('#community-description');
            
            const data = {
              name: nameFieldSubmit ? nameFieldSubmit.value : '',
              description: descFieldSubmit ? descFieldSubmit.value : ''
            };
            
            // Include either backgroundImage or icon based on selection
            if (isImageMode && backgroundImage) {
              data.backgroundImage = backgroundImage;
              data.icon = ''; // Clear icon when using image
              data.color = ''; // Clear color when using image
              data.bgColor = ''; // Clear bgColor when using image
            } else if (!isImageMode && icon) {
              data.icon = icon;
              data.backgroundImage = ''; // Clear image when using icon
              
              // Get icon colors
              const iconColorInput = modal.querySelector('#icon-color');
              const bgColorInput = modal.querySelector('#icon-bg-color');
              
              if (iconColorInput && iconColorInput.value !== '#000000') {
                data.color = iconColorInput.value;
              }
              
              if (bgColorInput && bgColorInput.value !== '#f8f9fa') {
                data.bgColor = bgColorInput.value;
              }
              
              console.log('[caiz] Icon colors - color:', data.color, 'bgColor:', data.bgColor);
            }
            
            // Save consent rule (auto-version and auto-translate to all locales) only if changed
            const mField = modal.querySelector('#community-consent-markdown');
            const m = mField ? mField.value : '';
            if (initialConsentMarkdown === null) {
              // No existing rule; only create when user provided non-empty content
              if (m && m.trim().length > 0) {
                await new Promise((resolve, reject) => {
                  if (!window.socket) return reject(new Error('[[error:socket-not-enabled]]'));
                  window.socket.emit('plugins.caiz.setConsentRule', { cid, markdown: m }, function (err) {
                    if (err) return reject(err);
                    resolve();
                  });
                });
              }
            } else if (m !== initialConsentMarkdown) {
              // Update only if content actually changed (including intentional deletion when m is empty)
              await new Promise((resolve, reject) => {
                if (!window.socket) return reject(new Error('[[error:socket-not-enabled]]'));
                window.socket.emit('plugins.caiz.setConsentRule', { cid, markdown: m }, function (err) {
                  if (err) return reject(err);
                  resolve();
                });
              });
            }

            console.log('[caiz] Saving community data:', data);
            await saveCommunityData(cid, data);
            
            // Success notification
            if (typeof alerts !== 'undefined') {
              alerts.success('Community information updated successfully');
            }
            
            // Close modal and refresh page only on success
            if (typeof bootbox !== 'undefined') {
              $('.bootbox').modal('hide');
            } else {
              closeCommunityEditModal();
            }
            
            setTimeout(() => window.location.reload(), 500);
            
          } catch (error) {
            console.error('[caiz] Error saving community data:', error);
            console.error('[caiz] Full error details:', error.stack);
            
            // Error notification - DO NOT RELOAD on error
            if (typeof alerts !== 'undefined') {
              alerts.error(error.message || 'An error occurred while saving');
            }
            
            // Keep modal open for debugging
            console.log('[caiz] Error occurred - modal kept open for debugging');
          } finally {
            // Reset loading state
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            submitBtn.disabled = false;
          }
        });
      }
    }, 300);
  });
}

// Make functions globally available
window.CommunityEditForm = {
  initializeCommunityEditForm,
  loadCommunityEditData,
  saveCommunityData
};
