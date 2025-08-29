/*global $, config, app, ajaxify, socket*/
'use strict';


async function getModalTranslate() {
    return new Promise((resolve, reject) => {
        require(['translator'], resolve);
    });
}

$(document).ready(function () {
    // Show the modal when the trigger is clicked
    $(document).on('click', '#create-community-trigger', function (e) {
        e.preventDefault();
        // Show the modal
        $('#community-create-modal').modal('show');
    });

    // モーダル内の作成ボタンのクリックイベント（多重バインド防止）
    const $btn = $('#submit-community-create');
    if ($btn.data('caizBound')) {
        return; // already bound elsewhere
    }
    $btn.data('caizBound', true);

    $btn.on('click', function() {
        const form = $('#community-create-form');

        const formData = form.serializeArray().reduce((obj, item) => {
            obj[item.name] = item.value;
            return obj;
        }, {}); // フォームデータをオブジェクトに変換

        // 簡単なクライアントサイドバリデーション (任意)
        if (!formData.name) {
            require(['alerts'], function(alerts) {
                alerts.warning('[[caiz:error.name_required]]');
            });
            return;
        }

        // ボタンを無効化 (二重送信防止)
        const submitBtn = $(this);
        submitBtn.prop('disabled', true).addClass('disabled');

        // サーバーサイドAPIへPOSTリクエスト
        // NodeBBのajaxifyを使うとCSRFなどを自動処理してくれる
        socket.emit('plugins.caiz.createCommunity', formData, function (err, response) {
            require(['alerts'], function(alerts) {
                if (err) {
                    alerts.error(err.message || '[[caiz:error.generic]]');
                } else {
                    $('#community-create-modal').modal('hide'); // モーダルを閉じる
                    alerts.success('[[caiz:success.community_created]]');
                    // 必要であれば作成されたコミュニティにリダイレクト
                    ajaxify.go(`/${response.community.handle}`);
                }
            });
            form[0].reset(); // フォームをリセット
            submitBtn.prop('disabled', false).removeClass('disabled');
        });
    });
});
