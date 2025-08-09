# タスク03: コミュニティ編集モーダルの実装

## 概要

コミュニティオーナーがEdit Communityボタンをクリックした際に表示される編集モーダルを実装する。モーダルは2分割レイアウト（左30%：メニュー、右70%：編集エリア）で構成される。

## 要件

- コミュニティオーナーのみがモーダルを開けること
- 2分割レイアウト（左サイドバー30%、右コンテンツエリア70%）
- 左サイドバーに3つのメニュー項目（編集、カテゴリー、メンバー）
- 右エリアで選択されたメニューに応じた編集フォームを表示
- モーダルの表示のみを実装（実際の編集機能は後続タスクで実装）

## 技術仕様

### レイアウト構造

```html
<div class="modal fade community-edit-modal" id="community-edit-modal">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Edit Community</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body p-0">
        <div class="row g-0 h-100">
          <!-- Left Sidebar (30%) -->
          <div class="col-md-4 sidebar-menu border-end">
            <div class="list-group list-group-flush">
              <a href="#" class="list-group-item list-group-item-action active" data-tab="general">
                <i class="fa fa-edit me-2"></i>編集
              </a>
              <a href="#" class="list-group-item list-group-item-action" data-tab="categories">
                <i class="fa fa-folder me-2"></i>カテゴリー
              </a>
              <a href="#" class="list-group-item list-group-item-action" data-tab="members">
                <i class="fa fa-users me-2"></i>メンバー
              </a>
            </div>
          </div>
          <!-- Right Content Area (70%) -->
          <div class="col-md-8 content-area">
            <div class="tab-content p-4">
              <div class="tab-pane active" id="general-tab">
                <h6 class="mb-3">コミュニティ情報編集</h6>
                <p class="text-muted">この機能は後続のタスクで実装予定です。</p>
              </div>
              <div class="tab-pane" id="categories-tab">
                <h6 class="mb-3">カテゴリー管理</h6>
                <p class="text-muted">この機能は後続のタスクで実装予定です。</p>
              </div>
              <div class="tab-pane" id="members-tab">
                <h6 class="mb-3">メンバー管理</h6>
                <p class="text-muted">この機能は後続のタスクで実装予定です。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### CSS仕様

```css
.community-edit-modal {
  .modal-dialog {
    max-width: 1200px;
    width: 90vw;
    height: 80vh;
  }
  
  .modal-content {
    height: 100%;
  }
  
  .modal-body {
    height: calc(100% - 60px); /* Header height */
    overflow: hidden;
  }
  
  .sidebar-menu {
    background-color: #f8f9fa;
    min-height: 100%;
    
    .list-group-item {
      border-radius: 0;
      border-left: none;
      border-right: none;
      
      &.active {
        background-color: #0d6efd;
        border-color: #0d6efd;
        color: white;
      }
      
      &:hover:not(.active) {
        background-color: #e9ecef;
      }
    }
  }
  
  .content-area {
    min-height: 100%;
    overflow-y: auto;
  }
}

@media (max-width: 768px) {
  .community-edit-modal {
    .modal-dialog {
      width: 95vw;
      height: 90vh;
    }
    
    .row.g-0 {
      flex-direction: column;
    }
    
    .sidebar-menu {
      min-height: auto;
    }
    
    .sidebar-menu .list-group {
      flex-direction: row;
      overflow-x: auto;
    }
    
    .sidebar-menu .list-group-item {
      flex: 0 0 auto;
      white-space: nowrap;
    }
  }
}
```

### JavaScript仕様

```javascript
// community-edit.js内の既存のedit button click handlerを更新

editBtn.on('click', function() {
  console.log('[caiz] Edit button clicked for community', cid);
  openCommunityEditModal(cid);
});

const openCommunityEditModal = (cid) => {
  const modal = new bootstrap.Modal(document.getElementById('community-edit-modal'));
  
  // Reset to first tab
  resetModalToFirstTab();
  
  // Store current community ID for later use
  modal._element.setAttribute('data-cid', cid);
  
  // Show modal
  modal.show();
  
  console.log('[caiz] Community edit modal opened for cid:', cid);
};

const resetModalToFirstTab = () => {
  // Reset sidebar menu
  document.querySelectorAll('.sidebar-menu .list-group-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector('.sidebar-menu .list-group-item[data-tab="general"]').classList.add('active');
  
  // Reset content tabs
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  document.getElementById('general-tab').classList.add('active');
};

const initializeModalNavigation = () => {
  document.querySelectorAll('.sidebar-menu .list-group-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Update sidebar active state
      document.querySelectorAll('.sidebar-menu .list-group-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      // Update content area
      const tabName = this.getAttribute('data-tab');
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
      document.getElementById(tabName + '-tab').classList.add('active');
      
      console.log('[caiz] Switched to tab:', tabName);
    });
  });
};
```

### 実装場所

1. **HTML テンプレート**
   - 新規ファイル: `plugins/nodebb-plugin-caiz/templates/partials/community-edit-modal.tpl`

2. **JavaScript**
   - 既存ファイル: `plugins/nodebb-plugin-caiz/static/community-edit.js`
   - モーダル表示とナビゲーション機能を追加

3. **CSS**
   - 既存ファイル: `plugins/nodebb-plugin-caiz/static/style.scss`
   - モーダル専用スタイルを追加

4. **テンプレート読み込み**
   - テーマのテンプレートまたはJavaScriptでの動的挿入

### 機能仕様

#### 基本動作
1. Edit Communityボタンクリック → モーダル表示
2. 初期状態は「編集」タブが選択状態
3. 左サイドバーのメニューをクリック → 右エリアのタブ切り替え
4. モーダル外クリックまたは×ボタンで閉じる

#### メニュー項目
- **編集**: コミュニティ基本情報（名前、説明、ロゴなど）
- **カテゴリー**: サブカテゴリの管理
- **メンバー**: メンバーのロール管理

#### レスポンシブ対応
- デスクトップ: 左右分割レイアウト
- モバイル: 上部にタブメニュー、下部にコンテンツ

### セキュリティ考慮事項

- モーダル表示前にオーナー権限を再確認
- 各タブの実機能実装時にサーバーサイドでの権限チェック必須
- XSS対策のため適切なエスケープ処理

### テスト項目

1. **モーダル表示**
   - Edit Community ボタンクリックでモーダルが開く
   - モーダル内のレイアウトが正しく表示される

2. **ナビゲーション**
   - 左サイドバーのメニューがクリックで切り替わる
   - 右エリアのコンテンツが対応するタブに切り替わる

3. **モーダル操作**
   - ×ボタンでモーダルが閉じる
   - モーダル外クリックで閉じる
   - Escキーで閉じる

4. **レスポンシブ**
   - モバイル表示で適切にレイアウトが変更される
   - タブメニューが横スクロール可能

5. **権限チェック**
   - 非オーナーユーザーはモーダルを開けない

## 実装優先度

**高**: Edit Community ボタンの次の重要なステップ