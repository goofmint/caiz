/*global $, config, app, ajaxify, socket*/
'use strict';

async function getAlert() {
    return new Promise((resolve, reject) => {
        require(['alerts'], resolve);
    });
}

async function getTranslate() {
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

    // モーダル内の作成ボタンのクリックイベント
    $('#submit-community-create').on('click', async () =>{
        const form = $('#community-create-form');

        const formData = form.serializeArray().reduce((obj, item) => {
            obj[item.name] = item.value;
            return obj;
        }, {}); // フォームデータをオブジェクトに変換

        // 簡単なクライアントサイドバリデーション (任意)
        const { alert } = await getAlert();
        if (!formData.name) {
            alert({
                type: 'warning',
                message: '[[caiz:error.name_required]]',
                timeout: 3000,
            });
            return;
        }

        // ボタンを無効化 (二重送信防止)
        const submitBtn = $(this);
        submitBtn.prop('disabled', true).addClass('disabled');

        // サーバーサイドAPIへPOSTリクエスト
        // NodeBBのajaxifyを使うとCSRFなどを自動処理してくれる
        socket.emit('plugins.caiz.createCommunity', formData, function(err, response) {
            if (err) {
                alert({
                    type: 'error',
                    message: err.message || '[[caiz:error.generic]]',
                    timeout: 3000,
                });
            } else {
                $('#community-create-modal').modal('hide'); // モーダルを閉じる
                alert({
                    type: 'success',
                    message: '[[caiz:success.community_created]]',
                    timeout: 3000,
                });
                // 必要であれば作成されたコミュニティにリダイレクト
                ajaxify.go(`/${response.community.handle}`);
            }
            form[0].reset(); // フォームをリセット
            submitBtn.prop('disabled', false).removeClass('disabled');
        });
    });
});