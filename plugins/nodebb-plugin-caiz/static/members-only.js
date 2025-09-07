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
      togglePostingElements(true);
      return;
    }

    console.log('[caiz] Checking follow status for cid:', cid, 'user uid:', app.user?.uid);

    // ゲストユーザーは投稿フォーム非表示
    if (!app.user || !app.user.uid) {
      console.log('[caiz] Guest user - hiding posting elements');
      togglePostingElements(false);
      return;
    }

    // フォロー状態をチェック
    socket.emit('plugins.caiz.getMemberRole', { cid: cid }, function (err, data) {
      console.log('[caiz] Socket response - err:', err, 'data:', data);
      
      if (err) {
        console.error('[caiz] Socket error:', err);
        togglePostingElements(true); // エラー時は表示
        return;
      }

      if (!data) {
        console.warn('[caiz] No data received from socket');
        togglePostingElements(true); // データなし時は表示
        return;
      }

      console.log('[caiz] Member role result:', data.role);
      
      // メンバー（owner, manager, member）なら投稿可能
      if (data.role && data.role !== 'guest' && data.role !== 'banned') {
        console.log('[caiz] User is a member - showing posting elements');
        hideRestrictionMessage();
        togglePostingElements(true);
      } else {
        console.log('[caiz] User is not a member - hiding posting elements and showing restriction message');
        togglePostingElements(false);
        showRestrictionMessage(cid);
      }
    });
  }

  function getPostingElementSelectors() {
    return [
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
  }

  function togglePostingElements(show) {
    const action = show ? 'Showing' : 'Hiding';
    console.log(`[caiz] ${action} posting elements`);
    
    const elements = getPostingElementSelectors();
    
    elements.forEach(selector => {
      const $elements = $(selector);
      if ($elements.length > 0) {
        console.log(`[caiz] ${action} ${$elements.length} elements: ${selector}`);
        if (show) {
          $elements.removeClass('hide').show();
        } else {
          $elements.addClass('hide').hide();
        }
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
        const msg = (err && err.message) || String(err || '');
        if (msg && msg.indexOf('[[caiz:error.consent.required]]') !== -1) {
          try {
            window.CaizConsent.requestConsentThen(cid, function () {
              window.socket.emit('plugins.caiz.followCommunity', { cid: cid }, function (err2, resp2) {
                if (err2) {
                  if (typeof app !== 'undefined' && app.alertError) app.alertError(err2.message || 'Error');
                  return;
                }
                window.location.reload();
              });
            });
            return;
          } catch (e) {
            console.error('[caiz] Consent UI error:', e);
          }
        }
        if (typeof app !== 'undefined' && app.alertError) {
          app.alertError('エラーが発生しました');
        } else {
          window.alert('エラーが発生しました');
        }
        return;
      }
      
      console.log('[caiz] Follow successful:', response);
      window.location.reload();
    });
  };
})();
