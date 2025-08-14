'use strict';

(function () {
  let socket;

  $(document).ready(function () {
    socket = app.socket;

    // Check posting permissions when category page loads
    if (ajaxify.data.template.category) {
      checkCategoryPostingPermissions();
    }

    // Check posting permissions when topic page loads
    if (ajaxify.data.template.topic) {
      checkTopicPostingPermissions();
    }

    // Listen for page changes
    $(window).on('action:ajaxify.end', function (ev, data) {
      if (data.url && data.url.indexOf('/category/') > -1) {
        checkCategoryPostingPermissions();
      } else if (data.url && data.url.indexOf('/topic/') > -1) {
        checkTopicPostingPermissions();
      }
    });
  });

  /**
   * カテゴリページでの投稿権限チェック
   */
  function checkCategoryPostingPermissions() {
    if (!app.user || !app.user.uid) {
      return;
    }

    const cid = ajaxify.data.cid;
    if (!cid) {
      return;
    }

    socket.emit('plugins.caiz.canPost', { cid: cid }, function (err, data) {
      if (err) {
        console.warn('[caiz] Error checking post permissions:', err.message);
        return;
      }

      updateCategoryUI(data.canPost);
    });
  }

  /**
   * トピックページでの投稿権限チェック
   */
  function checkTopicPostingPermissions() {
    if (!app.user || !app.user.uid) {
      return;
    }

    const cid = ajaxify.data.cid;
    if (!cid) {
      return;
    }

    socket.emit('plugins.caiz.canPost', { cid: cid }, function (err, data) {
      if (err) {
        console.warn('[caiz] Error checking post permissions:', err.message);
        return;
      }

      updateTopicUI(data.canPost);
    });
  }

  /**
   * カテゴリページのUI更新
   */
  function updateCategoryUI(canPost) {
    const $newTopicBtn = $('[component="category/post"]');
    
    if (!canPost) {
      // 「新しいトピック」ボタンを無効化
      $newTopicBtn.prop('disabled', true);
      $newTopicBtn.attr('title', '[[caiz:error.members-only-posting]]');
      $newTopicBtn.addClass('btn-outline-secondary');
      $newTopicBtn.removeClass('btn-primary');
      
      // メンバー専用の表示を追加
      if (!$('.members-only-notice').length) {
        const notice = $('<div class="alert alert-info members-only-notice">' +
          '<i class="fa fa-lock"></i> [[caiz:error.members-only-posting]]' +
          '</div>');
        $newTopicBtn.closest('.btn-toolbar').before(notice);
      }
    } else {
      // 権限がある場合は通常状態に戻す
      $newTopicBtn.prop('disabled', false);
      $newTopicBtn.removeAttr('title');
      $newTopicBtn.removeClass('btn-outline-secondary');
      $newTopicBtn.addClass('btn-primary');
      $('.members-only-notice').remove();
    }
  }

  /**
   * トピックページのUI更新
   */
  function updateTopicUI(canPost) {
    const $replyBtn = $('[component="topic/reply"]');
    const $quickReply = $('[component="topic/quickreply/container"]');
    
    if (!canPost) {
      // 返信ボタンを無効化
      $replyBtn.prop('disabled', true);
      $replyBtn.attr('title', '[[caiz:error.members-only-posting]]');
      $replyBtn.addClass('btn-outline-secondary');
      $replyBtn.removeClass('btn-primary');
      
      // クイック返信を無効化
      $quickReply.find('textarea').prop('disabled', true);
      $quickReply.find('textarea').attr('placeholder', '[[caiz:error.members-only-posting]]');
      $quickReply.find('button').prop('disabled', true);
      
      // メンバー専用の表示を追加
      if (!$('.members-only-notice').length) {
        const notice = $('<div class="alert alert-info members-only-notice">' +
          '<i class="fa fa-lock"></i> [[caiz:error.members-only-posting]]' +
          '</div>');
        $quickReply.before(notice);
      }
    } else {
      // 権限がある場合は通常状態に戻す
      $replyBtn.prop('disabled', false);
      $replyBtn.removeAttr('title');
      $replyBtn.removeClass('btn-outline-secondary');
      $replyBtn.addClass('btn-primary');
      
      $quickReply.find('textarea').prop('disabled', false);
      $quickReply.find('textarea').attr('placeholder', '[[topic:composer.default]]');
      $quickReply.find('button').prop('disabled', false);
      
      $('.members-only-notice').remove();
    }
  }
})();