# タスク03a: コミュニティ名編集機能の実装

## 概要

コミュニティ編集モーダルの「編集」タブにおいて、コミュニティ名（名前、スラグ、詳細、ロゴ）を編集する機能を実装する。

## 要件

- コミュニティオーナーのみがコミュニティ情報を編集可能
- モーダルの「編集」タブに編集フォームを表示
- 名前、スラグ、詳細、ロゴURLの編集が可能
- 保存ボタンクリックでサーバーにデータ送信
- リアルタイムでの入力バリデーション
- 保存成功時にモーダルを閉じて表示を更新

## 技術仕様

### フロントエンド実装

#### HTML構造（編集タブ内）

```html
<div class="tab-pane fade show active" id="general-tab">
  <h6 class="mb-3">コミュニティ情報編集</h6>
  
  <form id="community-edit-form">
    <div class="mb-3">
      <label for="community-name" class="form-label">コミュニティ名 *</label>
      <input type="text" class="form-control" id="community-name" name="name" required>
      <div class="invalid-feedback"></div>
    </div>
    
    <div class="mb-3">
      <label for="community-slug" class="form-label">スラグ *</label>
      <input type="text" class="form-control" id="community-slug" name="slug" required pattern="^[a-z0-9-]+$">
      <div class="form-text">英小文字、数字、ハイフンのみ使用可能</div>
      <div class="invalid-feedback"></div>
    </div>
    
    <div class="mb-3">
      <label for="community-description" class="form-label">詳細</label>
      <textarea class="form-control" id="community-description" name="description" rows="4"></textarea>
      <div class="invalid-feedback"></div>
    </div>
    
    <div class="mb-3">
      <label for="community-logo" class="form-label">ロゴURL</label>
      <input type="url" class="form-control" id="community-logo" name="backgroundImage">
      <div class="form-text">画像のURLを入力してください</div>
      <div class="invalid-feedback"></div>
    </div>
    
    <div class="d-flex justify-content-end">
      <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">キャンセル</button>
      <button type="submit" class="btn btn-primary">保存</button>
    </div>
  </form>
</div>
```

#### JavaScript実装

```javascript
const loadCommunityEditData = async (cid) => {
  return new Promise((resolve, reject) => {
    socket.emit('plugins.caiz.getCommunityData', { cid }, function(err, data) {
      if (err) {
        console.error('[caiz] Error loading community data:', err);
        reject(err);
        return;
      }
      resolve(data);
    });
  });
};

const saveCommunityData = async (cid, formData) => {
  return new Promise((resolve, reject) => {
    const data = {
      cid: cid,
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      backgroundImage: formData.backgroundImage
    };
    
    socket.emit('plugins.caiz.updateCommunityData', data, function(err, result) {
      if (err) {
        console.error('[caiz] Error saving community data:', err);
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

const initializeCommunityEditForm = (cid) => {
  const form = document.getElementById('community-edit-form');
  if (!form) return;
  
  // Load existing data
  loadCommunityEditData(cid).then(data => {
    document.getElementById('community-name').value = data.name || '';
    document.getElementById('community-slug').value = data.slug || '';
    document.getElementById('community-description').value = data.description || '';
    document.getElementById('community-logo').value = data.backgroundImage || '';
  }).catch(err => {
    console.error('[caiz] Failed to load community data:', err);
  });
  
  // Form validation
  form.addEventListener('input', validateForm);
  
  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await saveCommunityData(cid, data);
      
      // Success notification
      if (typeof alerts !== 'undefined') {
        alerts.success('コミュニティ情報を更新しました');
      }
      
      // Close modal and refresh page
      closeCommunityEditModal();
      setTimeout(() => window.location.reload(), 500);
      
    } catch (error) {
      // Error notification
      if (typeof alerts !== 'undefined') {
        alerts.error(error.message || 'エラーが発生しました');
      }
    }
  });
};

const validateForm = () => {
  const form = document.getElementById('community-edit-form');
  let isValid = true;
  
  // Name validation
  const nameField = document.getElementById('community-name');
  if (!nameField.value.trim()) {
    showFieldError(nameField, 'コミュニティ名は必須です');
    isValid = false;
  } else {
    clearFieldError(nameField);
  }
  
  // Slug validation
  const slugField = document.getElementById('community-slug');
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugField.value.trim()) {
    showFieldError(slugField, 'スラグは必須です');
    isValid = false;
  } else if (!slugPattern.test(slugField.value)) {
    showFieldError(slugField, '英小文字、数字、ハイフンのみ使用可能です');
    isValid = false;
  } else {
    clearFieldError(slugField);
  }
  
  return isValid;
};

const showFieldError = (field, message) => {
  field.classList.add('is-invalid');
  const feedback = field.parentNode.querySelector('.invalid-feedback');
  if (feedback) {
    feedback.textContent = message;
  }
};

const clearFieldError = (field) => {
  field.classList.remove('is-invalid');
};
```

### サーバーサイド実装

#### Socket APIメソッド

```javascript
// libs/community.js に追加

static async GetCommunityData(socket, { cid }) {
  winston.info(`[plugin/caiz] Getting community data for cid: ${cid}, uid: ${socket.uid}`);
  
  const { uid } = socket;
  if (!uid) {
    throw new Error('認証が必要です');
  }
  
  // Check ownership
  const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
  const isOwner = await Groups.isMember(uid, ownerGroup);
  
  if (!isOwner) {
    throw new Error('権限がありません');
  }
  
  // Get category data
  const categoryData = await Categories.getCategoryData(cid);
  
  return {
    name: categoryData.name,
    slug: categoryData.slug,
    description: categoryData.description,
    backgroundImage: categoryData.backgroundImage
  };
}

static async UpdateCommunityData(socket, data) {
  winston.info(`[plugin/caiz] Updating community data for cid: ${data.cid}, uid: ${socket.uid}`);
  
  const { uid } = socket;
  const { cid, name, slug, description, backgroundImage } = data;
  
  if (!uid) {
    throw new Error('認証が必要です');
  }
  
  // Check ownership
  const ownerGroup = await db.getObjectField(`category:${cid}`, 'ownerGroup');
  const isOwner = await Groups.isMember(uid, ownerGroup);
  
  if (!isOwner) {
    throw new Error('権限がありません');
  }
  
  // Validate input
  if (!name || !slug) {
    throw new Error('名前とスラグは必須です');
  }
  
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('スラグは英小文字、数字、ハイフンのみ使用可能です');
  }
  
  // Check slug uniqueness (exclude current category)
  const existingCategory = await Categories.getCategoryBySlugs([slug]);
  if (existingCategory.length > 0 && existingCategory[0].cid != cid) {
    throw new Error('このスラグは既に使用されています');
  }
  
  // Update category
  const updateData = {
    name: name.trim(),
    slug: slug.trim(),
    description: description ? description.trim() : '',
  };
  
  if (backgroundImage) {
    updateData.backgroundImage = backgroundImage.trim();
  }
  
  await Categories.update(cid, updateData);
  
  winston.info(`[plugin/caiz] Community data updated successfully for cid: ${cid}`);
  
  return { success: true };
}
```

## 実装場所

1. **JavaScript更新**
   - 既存ファイル: `plugins/nodebb-plugin-caiz/static/community-edit.js`
   - モーダル表示時のフォーム初期化を追加
   - フォームバリデーションとサブミット処理を追加

2. **サーバーサイド更新**
   - 既存ファイル: `plugins/nodebb-plugin-caiz/libs/community.js`
   - Socket APIメソッドを追加
   - 既存ファイル: `plugins/nodebb-plugin-caiz/library.js`
   - Socket API登録を追加

3. **モーダルテンプレート更新**
   - 既存ファイル: `plugins/nodebb-plugin-caiz/templates/partials/community-edit-modal.tpl`
   - 編集タブ内のHTMLを更新

## セキュリティ考慮事項

- サーバーサイドでのオーナー権限チェック必須
- 入力値のサニタイゼーション
- スラグの重複チェック
- XSS対策のための適切なエスケープ処理

## テスト項目

1. **フォーム表示**
   - 既存データが正しく表示される
   - フィールドが適切に初期化される

2. **バリデーション**
   - 必須フィールドのチェック
   - スラグ形式のバリデーション
   - リアルタイムエラー表示

3. **保存機能**
   - データが正しく保存される
   - 保存後の画面更新
   - エラー時の適切な通知

4. **権限チェック**
   - 非オーナーユーザーのアクセス制限
   - 未ログインユーザーのアクセス制限

## 実装優先度

**高**: Task 03の最初のサブタスクとして基本的な編集機能