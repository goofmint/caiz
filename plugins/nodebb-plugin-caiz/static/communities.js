const updateCommunities = async () => {
  console.log('[caiz] updateCommunities called');
  const communityUl = document.querySelector('nav[component="sidebar-communities"] ul');
  console.log('[caiz] Found communityUl:', communityUl);
  if (!communityUl) {
    console.log('[caiz] No sidebar-communities element found, skipping');
    return;
  }
  // remove all children
  communityUl.innerHTML = '';
  console.log('[caiz] Emitting getCommunities socket call');
  socket.emit('plugins.caiz.getCommunities', {}, async function (err, communities) {
    if (err) {
      const { alert } = await getAlert();
      return alert({
        type: 'error',
        message: err.message || 'Error loading communities',
        timeout: 3000,
      });
    }
    if (communities && Array.isArray(communities)) {
      communities.forEach(community => addCommunity(community, communityUl));
    }
  });
};

const addCommunity = (community, communityUl) => {
  const li = document.createElement('li');
  li.classList.add('nav-item', 'mx-2');
  li.setAttribute('data-bs-original-title', community.name);
  
  // Determine whether to show background image or icon
  let iconContent;
  if (community.backgroundImage) {
    iconContent = `<img src="${community.backgroundImage}" alt="${community.name}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">`;
  } else if (community.icon) {
    iconContent = `<i class="fa fa-fw ${community.icon}" data-content="" style="font-size: 14px;"></i>`;
  } else {
    // Fallback to first letter of community name
    iconContent = `<span style="font-size: 12px; font-weight: bold;">${community.name.charAt(0).toUpperCase()}</span>`;
  }
  
  li.innerHTML = `<a class="nav-link navigation-link d-flex gap-2 justify-content-between align-items-center" href="/${community.handle}" aria-label="${community.name}">
    <span class="d-flex gap-2 align-items-center text-nowrap truncate-open">
      <span class="position-relative">
        <span class="icon d-inline-flex justify-content-center align-items-center align-middle rounded-1 flex-shrink-0" style="background-color: ${community.backgroundImage ? 'transparent' : (community.bgColor || '#6c757d')}; border-color: ${community.backgroundImage ? 'transparent' : (community.bgColor || '#6c757d')} !important; color: ${community.color || '#fff'}; width: 24px !important; height: 24px !important;">
          ${iconContent}
        </span>
        <span component="navigation/count" class="visible-closed position-absolute top-0 start-100 translate-middle badge rounded-1 bg-primary hidden"></span>
      </span>
      <span class="nav-text small visible-open fw-semibold text-truncate">${community.name}</span>
    </span>
    <span component="navigation/count" class="visible-open badge rounded-1 bg-primary hidden"></span>
  </a>`;
  communityUl.appendChild(li);
};

const toggleCommunity = async () => {
  const sidebarEl = $('.community-sidebar');
  const isOpen = sidebarEl.hasClass('open');
  sidebarEl.toggleClass('open');
  
  const newState = sidebarEl.hasClass('open') ? 'on' : 'off';
  console.log('[caiz] Toggling sidebar from', isOpen ? 'open' : 'closed', 'to', newState);
  
  // Save to user settings (primary method)
  if (app.user && app.user.uid) {
    try {
      await api.put(`/users/${app.user.uid}/settings`, {
        settings: {
          openCommunitySidebars: newState,
        },
      });
      console.log('[caiz] Sidebar state saved to user settings:', newState);
    } catch (err) {
      console.error('[caiz] Failed to save sidebar state to user settings:', err);
    }
  }
  
  // Also save to localStorage as fallback
  localStorage.setItem('caiz-sidebar-state', newState);
  console.log('[caiz] Sidebar state saved to localStorage:', newState);
  
  $(window).trigger('action:sidebar.toggleCommunity');
};

const restoreSidebarState = () => {
  const sidebarEl = $('.community-sidebar');
  if (sidebarEl.length === 0) return;
  
  let shouldOpen = false;
  
  // Primary: Check user settings
  if (app.user && app.user.settings && app.user.settings.openCommunitySidebars === 'on') {
    shouldOpen = true;
    console.log('[caiz] Sidebar state from user settings: open');
  }
  // Fallback: Check localStorage
  else if (!app.user || !app.user.uid) {
    const savedState = localStorage.getItem('caiz-sidebar-state');
    shouldOpen = savedState === 'on';
    console.log('[caiz] Sidebar state from localStorage:', savedState);
  }
  
  if (shouldOpen) {
    sidebarEl.addClass('open');
    console.log('[caiz] Sidebar restored to open state');
  } else {
    sidebarEl.removeClass('open');
    console.log('[caiz] Sidebar restored to closed state');
  }
};

// NodeBBのajaxifyフックを使用してページ遷移時に実行
$(window).on('action:ajaxify.end', function () {
  if (!app.user || !app.user.uid) {
    console.log('[caiz] User not logged in, skipping community sidebar initialization');
    return;
  }
  
  // コミュニティサイドバーが存在する場合のみ処理
  const sidebar = document.querySelector('nav[component="sidebar-communities"]');
  if (sidebar) {
    updateCommunities();
    
    // トグルボタンのイベントを再設定
    $('[component="community/toggle"]').off('click').on('click', toggleCommunity);
    
    // ユーザー設定に基づいてサイドバーの状態を復元
    restoreSidebarState();
  }
});

// DOMContentLoadedでも初期化（初回ロード時用）
document.addEventListener('DOMContentLoaded', function () {
  if (!app.user || !app.user.uid) {
    console.log('[caiz] User not logged in, skipping community sidebar initialization');
    return;
  }
  
  const sidebar = document.querySelector('nav[component="sidebar-communities"]');
  if (sidebar) {
    updateCommunities();
    $('[component="community/toggle"]').on('click', toggleCommunity);
    
    restoreSidebarState();
  }
});
