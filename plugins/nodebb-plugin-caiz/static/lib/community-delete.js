'use strict';

define('forum/community-delete', ['translator', 'bootbox'], function (translator, bootbox) {
  const CommunityDelete = {};
  
  CommunityDelete.init = function(modal, communityData) {
    if (!communityData.isOwner) {
      return;
    }
    
    const dangerZoneHtml = `
      <div class="panel panel-danger danger-zone" style="margin-top: 30px;">
        <div class="panel-heading">
          <h3 class="panel-title">
            <i class="fa fa-exclamation-triangle"></i> 
            <span class="danger-zone-title">[[caiz:danger-zone.title]]</span>
            <button class="btn btn-xs btn-link pull-right" id="toggle-danger-zone">
              <i class="fa fa-chevron-down"></i>
            </button>
          </h3>
        </div>
        <div class="panel-body danger-zone-content" style="display: none;">
          <div class="alert alert-danger">
            <strong>[[caiz:danger-zone.warning]]</strong>
            <p>[[caiz:danger-zone.warning-description]]</p>
          </div>
          <div class="row">
            <div class="col-md-8">
              <h4>[[caiz:danger-zone.delete-community]]</h4>
              <p class="text-muted">[[caiz:danger-zone.delete-description]]</p>
            </div>
            <div class="col-md-4 text-right">
              <button class="btn btn-danger" id="delete-community-btn">
                [[caiz:danger-zone.delete-button]]
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    modal.find('.modal-body').append(dangerZoneHtml);
    
    // プログレッシブディスクロージャーのトグル
    modal.find('#toggle-danger-zone').on('click', function(e) {
      e.preventDefault();
      const $content = modal.find('.danger-zone-content');
      const $icon = $(this).find('i');
      
      if ($content.is(':visible')) {
        $content.slideUp();
        $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      } else {
        $content.slideDown();
        $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
      }
    });
    
    // 削除ボタンのクリックハンドラー
    modal.find('#delete-community-btn').on('click', function(e) {
      e.preventDefault();
      CommunityDelete.showDeleteConfirmation(communityData);
    });
    
    // 翻訳を適用
    translator.translate(modal.find('.danger-zone').get(0));
  };
  
  CommunityDelete.showDeleteConfirmation = function(communityData) {
    const confirmHtml = `
      <div class="delete-confirmation">
        <div class="alert alert-danger">
          <h4><i class="fa fa-exclamation-triangle"></i> [[caiz:danger-zone.confirm-title]]</h4>
          <p>[[caiz:danger-zone.confirm-warning]]</p>
          <ul>
            <li>[[caiz:danger-zone.delete-subcategories]]</li>
            <li>[[caiz:danger-zone.delete-topics]]</li>
            <li>[[caiz:danger-zone.delete-members]]</li>
            <li>[[caiz:danger-zone.delete-settings]]</li>
          </ul>
        </div>
        <hr>
        <p>[[caiz:danger-zone.type-name]]</p>
        <p><strong>${communityData.name}</strong></p>
        <input type="text" class="form-control" id="confirm-community-name" placeholder="[[caiz:danger-zone.type-name-placeholder]]">
        <div class="checkbox">
          <label>
            <input type="checkbox" id="confirm-understand"> 
            [[caiz:danger-zone.understand-permanent]]
          </label>
        </div>
      </div>
    `;
    
    translator.translate(confirmHtml, function(translatedHtml) {
      bootbox.dialog({
        title: '<span class="text-danger"><i class="fa fa-exclamation-triangle"></i> [[caiz:danger-zone.modal-title]]</span>',
        message: translatedHtml,
        buttons: {
          cancel: {
            label: '[[global:cancel]]',
            className: 'btn-default'
          },
          delete: {
            label: '[[caiz:danger-zone.confirm-delete]]',
            className: 'btn-danger',
            callback: function() {
              const typedName = $('#confirm-community-name').val();
              const understood = $('#confirm-understand').is(':checked');
              
              if (typedName !== communityData.name) {
                app.alertError('[[caiz:danger-zone.name-mismatch]]');
                return false;
              }
              
              if (!understood) {
                app.alertError('[[caiz:danger-zone.must-understand]]');
                return false;
              }
              
              CommunityDelete.executeDeletion(communityData.cid, communityData.name);
              return true;
            }
          }
        },
        onEscape: true
      });
      
      // 初期状態で削除ボタンを無効化
      const $deleteBtn = $('.bootbox .btn-danger');
      $deleteBtn.prop('disabled', true);
      
      // 入力チェック
      function checkEnableDelete() {
        const typedName = $('#confirm-community-name').val();
        const understood = $('#confirm-understand').is(':checked');
        $deleteBtn.prop('disabled', !(typedName === communityData.name && understood));
      }
      
      $('#confirm-community-name').on('input', checkEnableDelete);
      $('#confirm-understand').on('change', checkEnableDelete);
      
      // 翻訳を適用
      translator.translate($('.bootbox').get(0));
    });
  };
  
  CommunityDelete.executeDeletion = function(cid, name) {
    // 最終確認
    bootbox.confirm({
      title: '<span class="text-danger">[[caiz:danger-zone.final-confirm-title]]</span>',
      message: '[[caiz:danger-zone.final-confirm-message]]',
      buttons: {
        confirm: {
          label: '[[caiz:danger-zone.final-delete]]',
          className: 'btn-danger'
        },
        cancel: {
          label: '[[global:cancel]]',
          className: 'btn-default'
        }
      },
      callback: function(result) {
        if (!result) {
          return;
        }
        
        // プログレスインジケーター表示
        app.alert({
          type: 'info',
          alert_id: 'community-deleting',
          title: '[[caiz:danger-zone.deleting]]',
          message: '[[caiz:danger-zone.deleting-message]]',
          timeout: 0
        });
        
        // 削除実行
        socket.emit('plugins.caiz.deleteCommunity', { cid: cid }, function(err, response) {
          app.removeAlert('community-deleting');
          
          if (err) {
            app.alertError(err.message || '[[caiz:danger-zone.delete-error]]');
            return;
          }
          
          app.alertSuccess('[[caiz:danger-zone.delete-success]]');
          
          // コミュニティ一覧ページへリダイレクト
          setTimeout(function() {
            ajaxify.go('communities');
          }, 2000);
        });
      }
    });
    
    // 翻訳を適用
    translator.translate($('.bootbox').get(0));
  };
  
  return CommunityDelete;
});