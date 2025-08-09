# タスク02: コミュニティオーナー用Editボタンの実装

## 概要

コミュニティオーナーが自分のコミュニティを閲覧している際に、コミュニティのトップページに「Edit」ボタンを表示する機能を実装する。

## 要件

- コミュニティオーナーのみに「Edit」ボタンを表示
- ボタンはコミュニティトップページ（カテゴリ一覧ページ）に配置
- ボタンをクリックすると編集モーダルを開く（タスク03で実装）
- レスポンシブデザインに対応

## 技術仕様

### 実装場所

1. **サーバーサイド**
   - `plugins/nodebb-plugin-caiz/libs/community.js`
   - オーナー判定用のAPIエンドポイントまたはテンプレートデータ

2. **クライアントサイド**
   - 新規ファイル: `plugins/nodebb-plugin-caiz/static/community-edit.js`
   - カテゴリページでオーナー判定とボタン表示

3. **テンプレート**
   - カテゴリページテンプレートのカスタマイズ
   - またはJavaScriptでの動的挿入

### データ構造

```javascript
// オーナー判定に必要なデータ
{
  cid: 5,                    // カテゴリID
  ownerGroup: 'community-5-owners',  // オーナーグループ名
  isOwner: true/false        // 現在のユーザーがオーナーかどうか
}
```

### 実装方法

#### 方法1: テンプレートでの判定（推奨）

```html
{{{ if category.isOwner }}}
<button class="btn btn-primary community-edit-btn" data-cid="{category.cid}">
  <i class="fa fa-edit"></i> Edit Community
</button>
{{{ end }}}
```

#### 方法2: JavaScriptでの動的挿入

```javascript
// community-edit.js
$(window).on('action:ajaxify.end', function(event, data) {
  if (data.tpl_name !== 'category') return;
  
  // Check if user is community owner
  socket.emit('plugins.caiz.isCommunityOwner', {
    cid: ajaxify.data.cid
  }, function(err, result) {
    if (!err && result.isOwner) {
      addEditButton();
    }
  });
});

function addEditButton() {
  const editBtn = $('<button>')
    .addClass('btn btn-primary community-edit-btn')
    .attr('data-cid', ajaxify.data.cid)
    .html('<i class="fa fa-edit"></i> Edit Community');
  
  // Insert button in appropriate location
  $('.category-header').append(editBtn);
}
```

### APIエンドポイント

```javascript
// Socket API: plugins.caiz.isCommunityOwner
static async IsCommunityOwner(socket, { cid }) {
  const { uid } = socket;
  if (!uid) return { isOwner: false };
  
  // Get category data
  const category = await Categories.getCategoryData(cid);
  const ownerGroup = category.ownerGroup;
  
  // Check if user is in owner group
  const isOwner = await Groups.isMember(uid, ownerGroup);
  
  return { isOwner };
}
```

### ボタンデザイン

```css
.community-edit-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

@media (max-width: 768px) {
  .community-edit-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    padding: 0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  
  .community-edit-btn span {
    display: none;
  }
}
```

## セキュリティ考慮事項

- サーバーサイドでオーナー権限を必ず検証
- クライアントサイドの判定は表示制御のみに使用
- 実際の編集操作時に再度権限チェックを実施
- XSS対策としてユーザー入力は適切にエスケープ

## テスト項目

1. **オーナーユーザー**
   - コミュニティトップページでEditボタンが表示される
   - ボタンのクリックイベントが正常に動作する
   - モバイル表示でもボタンが適切に表示される

2. **非オーナーユーザー**
   - Editボタンが表示されない
   - DevToolsで要素を追加してもAPIが拒否する

3. **権限の変更**
   - オーナー権限を付与/剥奪した際の表示更新

## 依存関係

- タスク03（編集モーダル）と連携
- コミュニティ作成時のownerGroup設定が必要
- Groups APIへのアクセス権限

## 実装優先度

**高**: オーナーがコミュニティを管理するための入口となる重要機能