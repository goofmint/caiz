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
  sidebarEl.toggleClass('open');
  if (app.user.uid) {
    await api.put(`/users/${app.user.uid}/settings`, {
      settings: {
        openCommunitySidebars: sidebarEl.hasClass('open') ? 'on' : 'off',
      },
    });
  }
  $(window).trigger('action:sidebar.toggleCommunity');
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
    if (app.user.settings && app.user.settings.openCommunitySidebars === 'on') {
      $('.community-sidebar').addClass('open');
    }
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
    
    if (app.user.settings && app.user.settings.openCommunitySidebars === 'on') {
      $('.community-sidebar').addClass('open');
    }
  }
});
