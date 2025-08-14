'use strict';

console.log('[caiz] members-only.js loaded');

(function () {
  let socket;

  $(document).ready(function () {
    console.log('[caiz] members-only.js document ready');
    
    // ソケット初期化
    if (window.socket) {
      socket = window.socket;
      console.log('[caiz] Socket initialized from window.socket');
    } else {
      console.warn('[caiz] window.socket not available');
      return;
    }

    // 少し待ってから権限チェックを実行
    setTimeout(function() {
      checkAndControlPosting();
    }, 1000);

    // Listen for page changes
    $(window).on('action:ajaxify.end', function () {
      setTimeout(() => checkAndControlPosting(), 100);
    });
  });

  function checkAndControlPosting() {
    const cid = ajaxify.data.cid;
    if (!cid) {
      console.log('[caiz] No cid found, showing posting elements by default');
      showPostingElements();
      return;
    }

    console.log('[caiz] Checking follow status for cid:', cid, 'user uid:', app.user?.uid);

    // ゲストユーザーは投稿フォーム非表示
    if (!app.user || !app.user.uid) {
      console.log('[caiz] Guest user - hiding posting elements');
      hidePostingElements();
      return;
    }

    // まず投稿フォームを表示（デバッグ用）
    showPostingElements();
    console.log('[caiz] Posted elements shown by default');

    // フォロー状態をチェック
    socket.emit('plugins.caiz.isFollowed', { cid: cid }, function (err, data) {
      console.log('[caiz] Socket response - err:', err, 'data:', data);
      
      if (err) {
        console.error('[caiz] Socket error:', err);
        showPostingElements(); // エラー時は表示
        return;
      }

      if (!data) {
        console.warn('[caiz] No data received from socket');
        showPostingElements(); // データなし時は表示
        return;
      }

      console.log('[caiz] Follow status result:', data.isFollowed);
      
      if (data.isFollowed) {
        console.log('[caiz] User is following - showing posting elements');
        hideRestrictionMessage();
        showPostingElements();
      } else {
        console.log('[caiz] User is not following - hiding posting elements and showing restriction message');
        hidePostingElements();
        showRestrictionMessage(cid);
      }
    });
  }

  function hidePostingElements() {
    console.log('[caiz] Hiding posting elements');
    
    const elements = [
      '[component="topic/reply"]',
      '[component="topic/reply/container"]',
      '[component="topic/quickreply/container"]',
      '[component="topic/quickreply"]',
      '[component="composer"]',
      '.quickreply',
      '.composer',
      '.composer-container',
      '#composer-container',
      'form[action*="post"]',
      'textarea[data-action]',
      'textarea.write'
    ];
    
    elements.forEach(selector => {
      const $elements = $(selector);
      if ($elements.length > 0) {
        console.log(`[caiz] Hiding ${$elements.length} elements: ${selector}`);
        $elements.addClass('hide').hide();
      }
    });
  }

  function showPostingElements() {
    console.log('[caiz] Showing posting elements');
    
    const elements = [
      '[component="topic/reply"]',
      '[component="topic/reply/container"]',
      '[component="topic/quickreply/container"]',
      '[component="topic/quickreply"]',
      '[component="composer"]',
      '.quickreply',
      '.composer',
      '.composer-container',
      '#composer-container',
      'form[action*="post"]',
      'textarea[data-action]',
      'textarea.write'
    ];
    
    elements.forEach(selector => {
      const $elements = $(selector);
      if ($elements.length > 0) {
        console.log(`[caiz] Showing ${$elements.length} elements: ${selector}`);
        $elements.removeClass('hide').show();
      }
    });
  }

  function showRestrictionMessage(cid) {
    console.log('[caiz] Showing restriction message');
    
    // 既存のメッセージを削除
    hideRestrictionMessage();
    
    // 翻訳システムを使用してメッセージを表示
    require(['translator'], function(translator) {
      translator.translate('[[caiz:posting.members-only]]', function(membersMsg) {
        translator.translate('[[caiz:join-community]]', function(joinBtn) {
          const message = '<i class="fa fa-lock"></i> ' + membersMsg;
          const actionButton = '<button class="btn btn-primary btn-sm ms-2" onclick="followCommunity(' + cid + ')">' + joinBtn + '</button>';
          
          const restrictionMessage = $(`<div class="alert alert-info members-only-restriction d-flex align-items-center justify-content-between mb-3">
            <div>${message}</div>
            <div>${actionButton}</div>
          </div>`);
          
          // 複数の場所に表示を試行
          let messageInserted = false;
          
          // トピック返信エリアの代わりに表示
          const $quickReply = $('[component="topic/quickreply/container"]');
          if ($quickReply.length) {
            $quickReply.after(restrictionMessage.clone());
            messageInserted = true;
          }
          
          // 返信ボタンの近くに表示
          const $replyBtn = $('[component="topic/reply"]');
          if ($replyBtn.length) {
            $replyBtn.closest('.topic-main-buttons, .topic-footer').after(restrictionMessage.clone());
            messageInserted = true;
          }
          
          // フォールバック: ページ下部に表示
          if (!messageInserted) {
            $('.posts-container').last().after(restrictionMessage.clone());
          }
        });
      });
    });
  }

  function hideRestrictionMessage() {
    $('.members-only-restriction').remove();
  }

  // フォロー機能
  window.followCommunity = function(cid) {
    console.log('[caiz] followCommunity called with cid:', cid);
    
    if (!window.socket) {
      console.error('[caiz] Socket not available');
      return;
    }

    window.socket.emit('plugins.caiz.followCommunity', { cid: cid }, function (err, response) {
      if (err) {
        console.error('[caiz] Follow action error:', err);
        alert('エラーが発生しました');
        return;
      }
      
      console.log('[caiz] Follow successful:', response);
      window.location.reload();
    });
  };
})();