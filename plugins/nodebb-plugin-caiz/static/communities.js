// フラグで重複実行を防ぐ
let isUpdatingCommunities = false;

const updateCommunities = async () => {
  console.log('[caiz] updateCommunities called, isUpdating:', isUpdatingCommunities);
  
  // 既に実行中の場合はスキップ
  if (isUpdatingCommunities) {
    console.log('[caiz] Already updating communities, skipping');
    return;
  }
  
  const communityUl = document.querySelector('nav[component="sidebar-communities"] ul');
  console.log('[caiz] Found communityUl:', communityUl);
  if (!communityUl) {
    console.log('[caiz] No sidebar-communities element found, skipping');
    return;
  }
  
  isUpdatingCommunities = true;
  
  // remove all children
  communityUl.innerHTML = '';
  console.log('[caiz] Emitting getCommunities socket call');
  
  // Check if socket is available
  if (typeof socket === 'undefined') {
    console.error('[caiz] Socket is undefined, cannot load communities');
    isUpdatingCommunities = false;
    return;
  }
  
  socket.emit('plugins.caiz.getCommunities', {}, async function (err, communities) {
    console.log('[caiz] getCommunities response - err:', err, 'communities:', communities);
    // フラグをリセット
    isUpdatingCommunities = false;
    
    if (err) {
      console.error('[caiz] Error loading communities:', err);
      const { alert } = await getCaizAlert();
      return alert({
        type: 'error',
        message: err.message || 'Error loading communities',
        timeout: 3000,
      });
    }
    if (communities && Array.isArray(communities)) {
      console.log('[caiz] Adding', communities.length, 'communities to sidebar');
      communities.forEach(community => {
        console.log('[caiz] Adding community:', community.name);
        addCommunity(community, communityUl);
      });
    } else {
      console.log('[caiz] No communities data or not an array:', communities);
    }
  });
};

// Security utilities
const communitiesEscapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const decodeHtmlEntities = (text) => {
  if (!text) return text;
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || div.innerText || text;
};

const isValidUrl = (url) => {
  if (!url) return false;
  
  // Allow relative URLs starting with /
  if (url.startsWith('/')) return true;
  
  // Allow data URLs
  if (url.startsWith('data:image/')) return true;
  
  // Check absolute URLs
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidIcon = (icon) => {
  // Allow only FontAwesome classes
  return /^fa-[a-z0-9-]+$/.test(icon);
};

const isValidColor = (color) => {
  // Allow hex colors and basic named colors
  return /^#[0-9a-fA-F]{3,6}$/.test(color) || 
         ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'black', 'white'].includes(color);
};

const addCommunity = (community, communityUl) => {
  const li = document.createElement('li');
  li.classList.add('nav-item', 'mx-2');
  
  // Use decoded community name (NodeBB already handles server-side escaping)
  const safeName = decodeHtmlEntities(community.name || 'Unnamed Community');
  li.setAttribute('data-bs-original-title', safeName);
  
  // Sanitize colors
  const safeBgColor = isValidColor(community.bgColor) ? community.bgColor : '#6c757d';
  const safeColor = isValidColor(community.color) ? community.color : '#fff';
  
  // Determine whether to show background image or icon
  let iconContent;
  let iconElement;
  
  if (community.backgroundImage) {
    // Decode HTML entities in the URL
    const decodedUrl = decodeHtmlEntities(community.backgroundImage);
    
    iconElement = document.createElement('img');
    iconElement.src = decodedUrl;
    iconElement.alt = safeName;
    iconElement.style.cssText = 'width: 24px; height: 24px; object-fit: cover; border-radius: 4px;';
    iconContent = iconElement.outerHTML;
  } else if (community.icon && isValidIcon(community.icon)) {
    iconElement = document.createElement('i');
    iconElement.className = `fa fa-fw ${community.icon}`;
    iconElement.style.fontSize = '14px';
    iconContent = iconElement.outerHTML;
  } else {
    // Fallback to first letter of community name
    iconElement = document.createElement('span');
    iconElement.style.cssText = 'font-size: 12px; font-weight: bold;';
    iconElement.textContent = safeName.charAt(0).toUpperCase();
    iconContent = iconElement.outerHTML;
  }
  
  // Create elements safely
  const link = document.createElement('a');
  link.className = 'nav-link navigation-link d-flex gap-2 justify-content-between align-items-center';
  link.href = `/${decodeHtmlEntities(community.handle || '')}`;
  link.setAttribute('aria-label', safeName);
  
  const mainSpan = document.createElement('span');
  mainSpan.className = 'd-flex gap-2 align-items-center text-nowrap truncate-open';
  
  const relativeSpan = document.createElement('span');
  relativeSpan.className = 'position-relative';
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'icon d-inline-flex justify-content-center align-items-center align-middle rounded-1 flex-shrink-0';
  // Apply background color only when using icon or first letter, not for images
  const hasBackgroundImage = community.backgroundImage && isValidUrl(community.backgroundImage);
  iconSpan.style.cssText = `background-color: ${hasBackgroundImage ? 'transparent' : safeBgColor}; border-color: ${hasBackgroundImage ? 'transparent' : safeBgColor} !important; color: ${safeColor}; width: 24px !important; height: 24px !important;`;
  iconSpan.innerHTML = iconContent;
  
  const badgeSpan1 = document.createElement('span');
  badgeSpan1.setAttribute('component', 'navigation/count');
  badgeSpan1.className = 'visible-closed position-absolute top-0 start-100 translate-middle badge rounded-1 bg-primary hidden';
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'nav-text small visible-open fw-semibold text-truncate';
  // Use textContent to safely set text without HTML interpretation
  nameSpan.textContent = safeName;
  
  const badgeSpan2 = document.createElement('span');
  badgeSpan2.setAttribute('component', 'navigation/count');
  badgeSpan2.className = 'visible-open badge rounded-1 bg-primary hidden';
  
  // Assemble elements
  relativeSpan.appendChild(iconSpan);
  relativeSpan.appendChild(badgeSpan1);
  mainSpan.appendChild(relativeSpan);
  mainSpan.appendChild(nameSpan);
  link.appendChild(mainSpan);
  link.appendChild(badgeSpan2);
  li.appendChild(link);
  
  communityUl.appendChild(li);
};

const toggleCommunity = async () => {
  const sidebarEl = $('.community-sidebar');
  const isOpen = sidebarEl.hasClass('open');
  sidebarEl.toggleClass('open');
  
  const newState = sidebarEl.hasClass('open') ? 'on' : 'off';
  
  // Save to user settings (primary method)
  if (app.user && app.user.uid) {
    try {
      await api.put(`/users/${app.user.uid}/settings`, {
        settings: {
          openCommunitySidebars: newState,
        },
      });
    } catch (err) {
      console.error('[caiz] Failed to save sidebar state to user settings:', err);
    }
  }
  
  // Also save to localStorage and sessionStorage as fallback
  localStorage.setItem('caiz-sidebar-state', newState);
  sessionStorage.setItem('caiz-sidebar-state', newState);
  
  $(window).trigger('action:sidebar.toggleCommunity');
};

const restoreSidebarState = () => {
  const sidebarEl = $('.community-sidebar');
  if (sidebarEl.length === 0) return;
  
  let shouldOpen = false;
  
  // Check user settings
  if (app.user && app.user.settings && app.user.settings.openCommunitySidebars) {
    shouldOpen = app.user.settings.openCommunitySidebars === 'on';
  }
  // Fallback to localStorage
  else {
    const savedState = localStorage.getItem('caiz-sidebar-state');
    shouldOpen = savedState === 'on';
  }
  
  if (shouldOpen) {
    sidebarEl.addClass('open');
  } else {
    sidebarEl.removeClass('open');
  }
};

// NodeBBのajaxifyフックを使用してページ遷移時に実行
// offを使って既存のイベントハンドラーを削除してから登録
$(window).off('action:ajaxify.end.communities').on('action:ajaxify.end.communities', function () {
  console.log('[caiz] ajaxify.end.communities triggered');
  if (!app.user || !app.user.uid) {
    console.log('[caiz] User not logged in, skipping community sidebar initialization');
    return;
  }
  
  // コミュニティサイドバーが存在する場合のみ処理
  const sidebar = document.querySelector('nav[component="sidebar-communities"]');
  if (sidebar) {
    console.log('[caiz] Sidebar found, calling updateCommunities');
    updateCommunities();
    
    // トグルボタンのイベントを再設定
    $('[component="community/toggle"]').off('click').on('click', toggleCommunity);
    
    // ユーザー設定に基づいてサイドバーの状態を復元
    restoreSidebarState();
  } else {
    console.log('[caiz] Sidebar not found');
  }
  
  // Initialize modal functionality on each page load
  initCommunityCreateModal();
});

// Community creation modal functionality
const initCommunityCreateModal = () => {
  const modal = document.getElementById('community-create-modal');
  const form = document.getElementById('community-create-form');
  const submitBtn = document.getElementById('submit-community-create');
  
  if (!modal || !form || !submitBtn) {
    console.log('[caiz] Community create modal elements not found');
    return;
  }
  
  // Handle form submission
  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const nameInput = document.getElementById('community-name');
    const descInput = document.getElementById('community-description');
    
    if (!nameInput || !nameInput.value.trim()) {
      const { alert } = await getCaizAlert();
      return alert({
        type: 'error',
        message: 'Community name is required',
        timeout: 3000,
      });
    }
    
    const formData = {
      name: nameInput.value.trim(),
      description: descInput ? descInput.value.trim() : ''
    };
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    try {
      // Use WebSocket instead of HTTP POST
      const result = await new Promise((resolve, reject) => {
        window.socket.emit('plugins.caiz.createCommunity', formData, (err, data) => {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
      
      // Close modal
      if (typeof $ !== 'undefined' && $.fn.modal) {
        $(modal).modal('hide');
      }
      
      // Reset form
      form.reset();
      
      // Update communities list
      await updateCommunities();
      
      const { alert } = await getCaizAlert();
      alert({
        type: 'success',
        message: 'Community created successfully!',
        timeout: 3000,
      });
      
    } catch (error) {
      console.error('[caiz] Failed to create community:', error);
      const { alert } = await getCaizAlert();
      alert({
        type: 'error',
        message: 'Failed to create community. Please try again.',
        timeout: 3000,
      });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = document.querySelector('[data-original-text]')?.getAttribute('data-original-text') || 'Create';
    }
  });
  
  // Reset form when modal is closed
  modal.addEventListener('hidden.bs.modal', () => {
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = document.querySelector('[data-original-text]')?.getAttribute('data-original-text') || 'Create';
  });
};

// Helper function to get alert utility
const getCaizAlert = async () => {
  if (window.bootbox) {
    return {
      alert: ({ type, message, timeout }) => {
        const alertClass = type === 'error' ? 'danger' : type;
        bootbox.alert({
          message: `<div class="alert alert-${alertClass}">${message}</div>`,
          backdrop: true
        });
        if (timeout) {
          setTimeout(() => {
            $('.bootbox').modal('hide');
          }, timeout);
        }
      }
    };
  }
  
  // Fallback to browser alert
  return {
    alert: ({ message }) => {
      window.alert(message);
    }
  };
};

// DOMContentLoadedでは初期化のみ（updateCommunitiesはajaxifyで実行）
document.addEventListener('DOMContentLoaded', function () {
  // Initialize modal functionality
  initCommunityCreateModal();
});
