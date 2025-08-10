// AI Moderation Management Interface
const ModerationManager = {
  currentCid: null,
  
  init: function(cid) {
    this.currentCid = cid;
    this.bindEvents();
    this.loadPendingPosts();
    this.loadModerationSettings();
  },
  
  bindEvents: function() {
    // Bind review action buttons
    $(document).on('click', '[data-action="approve-post"]', (e) => {
      const pid = $(e.target).closest('[data-pid]').attr('data-pid');
      this.reviewPost(pid, 'approve');
    });
    
    $(document).on('click', '[data-action="reject-post"]', (e) => {
      const pid = $(e.target).closest('[data-pid]').attr('data-pid');
      this.reviewPost(pid, 'reject');
    });
    
    // Bind settings update
    $(document).on('click', '[data-action="update-moderation-settings"]', (e) => {
      this.updateModerationSettings();
    });
    
    // Bind refresh button
    $(document).on('click', '[data-action="refresh-moderation"]', (e) => {
      this.loadPendingPosts();
    });
  },
  
  loadPendingPosts: function(page = 1) {
    if (!this.currentCid) return;
    
    const container = $('[component="moderation-queue"]');
    if (!container.length) return;
    
    // Show loading state
    container.html('<div class="text-center"><i class="fa fa-spinner fa-spin"></i> 読み込み中...</div>');
    
    socket.emit('plugins.caiz.getPendingPosts', {
      cid: this.currentCid,
      page: page,
      limit: 20
    }, (err, data) => {
      if (err) {
        container.html(`<div class="alert alert-danger">エラー: ${err.message}</div>`);
        return;
      }
      
      this.renderPendingPosts(data.posts, data.totalCount);
    });
  },
  
  renderPendingPosts: function(posts, totalCount) {
    const container = $('[component="moderation-queue"]');
    
    if (!posts || posts.length === 0) {
      container.html('<div class="alert alert-info">承認待ちの投稿はありません。</div>');
      return;
    }
    
    let html = `<div class="mb-3"><strong>${totalCount}件の投稿が承認待ちです</strong></div>`;
    
    posts.forEach(post => {
      const riskCategories = Object.entries(post.risk_categories || {})
        .filter(([_, score]) => score > 50)
        .map(([category, score]) => `<span class="badge bg-warning me-1">${category} (${score})</span>`)
        .join('');
      
      html += `
        <div class="card mb-3" data-pid="${post.pid}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>ユーザー: ${post.username}</strong>
              <span class="badge bg-danger ms-2">スコア: ${post.ai_score}</span>
            </div>
            <div>
              <button class="btn btn-sm btn-success me-1" data-action="approve-post">
                <i class="fa fa-check"></i> 承認
              </button>
              <button class="btn btn-sm btn-danger" data-action="reject-post">
                <i class="fa fa-times"></i> 拒否
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="mb-2">
              ${riskCategories}
            </div>
            <div class="content-preview" style="max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${this.escapeHtml(post.content)}
            </div>
            <div class="text-muted mt-2">
              <small>作成日時: ${new Date(post.created_at).toLocaleString('ja-JP')}</small>
            </div>
          </div>
        </div>
      `;
    });
    
    container.html(html);
  },
  
  reviewPost: function(pid, action) {
    if (!pid || !action) return;
    
    const reason = action === 'reject' ? prompt('拒否理由を入力してください（任意）:') : null;
    if (action === 'reject' && reason === null) return; // User cancelled
    
    socket.emit('plugins.caiz.reviewPost', {
      pid: parseInt(pid),
      action: action,
      reason: reason
    }, (err, result) => {
      if (err) {
        this.showAlert('error', `エラー: ${err.message}`);
        return;
      }
      
      this.showAlert('success', `投稿を${action === 'approve' ? '承認' : '拒否'}しました。`);
      
      // Remove the post from the queue display
      $(`[data-pid="${pid}"]`).fadeOut(300, function() {
        $(this).remove();
      });
    });
  },
  
  loadModerationSettings: function() {
    if (!this.currentCid) return;
    
    socket.emit('plugins.caiz.getModerationSettings', {
      cid: this.currentCid
    }, (err, settings) => {
      if (err) {
        console.error('Failed to load moderation settings:', err);
        return;
      }
      
      this.renderModerationSettings(settings);
    });
  },
  
  renderModerationSettings: function(settings) {
    const container = $('[component="moderation-settings"]');
    if (!container.length) return;
    
    const html = `
      <div class="mb-3">
        <label class="form-label">
          <input type="checkbox" ${settings.enabled ? 'checked' : ''}> 
          AIモデレーションを有効にする
        </label>
      </div>
      <div class="mb-3">
        <label class="form-label">モデレーション閾値: <span id="threshold-moderate-value">${settings.thresholdModerate}</span></label>
        <input type="range" class="form-range" min="0" max="100" value="${settings.thresholdModerate}" 
               id="threshold-moderate" oninput="document.getElementById('threshold-moderate-value').textContent=this.value">
      </div>
      <div class="mb-3">
        <label class="form-label">自動拒否閾値: <span id="threshold-reject-value">${settings.thresholdReject}</span></label>
        <input type="range" class="form-range" min="0" max="100" value="${settings.thresholdReject}" 
               id="threshold-reject" oninput="document.getElementById('threshold-reject-value').textContent=this.value">
      </div>
      <div class="mb-3">
        <h6>検出カテゴリ</h6>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" ${settings.categories.harassment ? 'checked' : ''} id="category-harassment">
          <label class="form-check-label" for="category-harassment">ハラスメント</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" ${settings.categories.hate ? 'checked' : ''} id="category-hate">
          <label class="form-check-label" for="category-hate">ヘイトスピーチ</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" ${settings.categories.violence ? 'checked' : ''} id="category-violence">
          <label class="form-check-label" for="category-violence">暴力的内容</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" ${settings.categories.sexual ? 'checked' : ''} id="category-sexual">
          <label class="form-check-label" for="category-sexual">性的内容</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" ${settings.categories.spam ? 'checked' : ''} id="category-spam">
          <label class="form-check-label" for="category-spam">スパム</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" ${settings.categories.misinformation ? 'checked' : ''} id="category-misinformation">
          <label class="form-check-label" for="category-misinformation">誤情報</label>
        </div>
      </div>
      <button class="btn btn-primary" data-action="update-moderation-settings">設定を保存</button>
    `;
    
    container.html(html);
  },
  
  updateModerationSettings: function() {
    if (!this.currentCid) return;
    
    const settings = {
      enabled: $('[component="moderation-settings"] input[type="checkbox"]:first').is(':checked'),
      thresholdModerate: parseInt($('#threshold-moderate').val()),
      thresholdReject: parseInt($('#threshold-reject').val()),
      categories: {
        harassment: $('#category-harassment').is(':checked'),
        hate: $('#category-hate').is(':checked'),
        violence: $('#category-violence').is(':checked'),
        sexual: $('#category-sexual').is(':checked'),
        spam: $('#category-spam').is(':checked'),
        misinformation: $('#category-misinformation').is(':checked')
      }
    };
    
    socket.emit('plugins.caiz.updateModerationSettings', {
      cid: this.currentCid,
      settings: settings
    }, (err, updatedSettings) => {
      if (err) {
        this.showAlert('error', `設定の保存に失敗しました: ${err.message}`);
        return;
      }
      
      this.showAlert('success', 'モデレーション設定を保存しました。');
    });
  },
  
  showAlert: function(type, message) {
    // Create a simple alert (in a real implementation, you'd use NodeBB's alert system)
    const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
    const alertHtml = `<div class="alert ${alertClass} alert-dismissible fade show" role="alert">
      ${this.escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
    
    $('[component="moderation-alerts"]').html(alertHtml);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      $('[component="moderation-alerts"] .alert').fadeOut();
    }, 5000);
  },
  
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize when page loads
$(document).ready(() => {
  // Check if we're on a community page and have moderation permissions
  if (typeof ajaxify !== 'undefined' && ajaxify.data && ajaxify.data.cid) {
    // Initialize moderation manager if user has permissions
    if (app.user && app.user.uid && $('.moderation-panel').length > 0) {
      ModerationManager.init(ajaxify.data.cid);
    }
  }
});

// Re-initialize on page navigation
$(window).on('action:ajaxify.end', () => {
  if (typeof ajaxify !== 'undefined' && ajaxify.data && ajaxify.data.cid) {
    if (app.user && app.user.uid && $('.moderation-panel').length > 0) {
      ModerationManager.init(ajaxify.data.cid);
    }
  }
});