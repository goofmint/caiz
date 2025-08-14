# タスク08: コミュニティ編集モーダルにデンジャーゾーン（コミュニティ削除）

## 概要
コミュニティ編集モーダルに「デンジャーゾーン」セクションを追加し、コミュニティオーナーがコミュニティを削除できる機能を実装します。これは破壊的な操作であるため、適切な警告と確認プロセスを含める必要があります。

## 要件

### 1. UI要件
- コミュニティ編集モーダルの最下部に「デンジャーゾーン」セクションを追加
- 赤色の警告色を使用した視覚的に目立つデザイン
- 削除ボタンは通常状態では無効化し、確認プロセスを経て有効化

### 2. 権限要件
- コミュニティオーナーのみが削除可能
- マネージャーやメンバーには表示しない

### 3. 確認プロセス
- 削除前に複数段階の確認を実施
- コミュニティ名の入力による確認
- 最終確認ダイアログ

### 4. 削除処理
- コミュニティおよび全サブカテゴリの削除
- 全投稿とトピックの削除
- 関連グループの削除
- メンバーシップ情報のクリーンアップ

## 実装設計

### クライアント側

#### 1. UIコンポーネント追加位置
```javascript
// static/lib/community-edit-modal.js

function renderDangerZone(modal, communityData) {
  // デンジャーゾーンセクションのレンダリング
  // - オーナーの場合のみ表示
  // - 削除ボタンと確認UI
}
```

#### 2. 削除確認フロー
```javascript
function initiateDeletion(communityId, communityName) {
  // ステップ1: 初期警告ダイアログ
  // - 削除の影響についての説明
  // - 「本当に削除しますか？」の確認
  
  // ステップ2: コミュニティ名入力による確認
  // - テキストフィールドでコミュニティ名を入力
  // - 正確に一致した場合のみ次へ進める
  
  // ステップ3: 最終確認
  // - 「この操作は取り消せません」の警告
  // - 削除実行
}
```

### サーバー側

#### 1. ソケットハンドラー
```javascript
// libs/community.js

class Community {
  static async DeleteCommunity(socket, { cid }) {
    // 1. 権限確認（オーナーのみ）
    // 2. コミュニティ存在確認
    // 3. 削除処理の実行
    // 4. 成功/失敗の通知
  }
}
```

#### 2. 削除処理実装
```javascript
// libs/community/core.js

async function deleteCommunity(uid, cid) {
  // 1. オーナー権限の確認
  // 2. サブカテゴリの取得と削除
  // 3. トピックと投稿の削除
  // 4. グループの削除（owners, managers, members, banned）
  // 5. フォロー情報のクリーンアップ
  // 6. カテゴリ自体の削除
  // 7. ログ記録
}
```

#### 3. クリーンアップ処理
```javascript
// libs/community/cleanup.js

async function cleanupCommunityData(cid) {
  // 1. ユーザーのフォロー情報から削除
  // 2. 通知設定から削除
  // 3. キャッシュのクリア
  // 4. その他の関連データのクリーンアップ
}
```

### データベース処理

#### 削除対象データ
1. カテゴリデータ
   - `category:{cid}`
   - `category:{cid}:*`

2. グループデータ
   - `group:cid:{cid}:owners`
   - `group:cid:{cid}:managers`
   - `group:cid:{cid}:members`
   - `group:cid:{cid}:banned`

3. フォロー情報
   - `uid:*:followed_cats` から該当cidを削除

4. トピックとポスト
   - カテゴリ内の全トピック
   - トピック内の全ポスト

## セキュリティ考慮事項

1. **権限チェックの厳格化**
   - サーバー側で必ずオーナー権限を確認
   - クライアント側の権限チェックは信頼しない

2. **誤操作防止**
   - 複数段階の確認プロセス
   - コミュニティ名の手動入力による確認

3. **監査ログ**
   - 削除操作の記録
   - 実行者、日時、対象コミュニティの情報を保存

4. **レート制限**
   - 削除操作にレート制限を適用
   - 短時間での複数削除を防止

## エラーハンドリング

1. **削除失敗時の処理**
   - 部分的な削除の防止（トランザクション的処理）
   - エラーメッセージの適切な表示
   - ロールバック機能の検討

2. **復旧不可能性の警告**
   - データの完全削除であることを明確に伝える
   - バックアップの推奨

## UI/UXデザイン

### デンジャーゾーンセクション
```html
<div class="danger-zone">
  <h4 class="text-danger">
    <i class="fa fa-exclamation-triangle"></i> デンジャーゾーン
  </h4>
  <div class="alert alert-danger">
    <p>以下の操作は取り消すことができません。慎重に実行してください。</p>
  </div>
  <div class="danger-zone-action">
    <div>
      <strong>コミュニティを削除</strong>
      <p class="text-muted">
        このコミュニティと全てのコンテンツを完全に削除します
      </p>
    </div>
    <button class="btn btn-danger" id="delete-community-btn">
      コミュニティを削除
    </button>
  </div>
</div>
```

### 確認ダイアログ
```html
<div class="modal fade" id="delete-confirmation-modal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header bg-danger text-white">
        <h4 class="modal-title">
          <i class="fa fa-exclamation-triangle"></i> 
          コミュニティの削除
        </h4>
      </div>
      <div class="modal-body">
        <div class="alert alert-danger">
          <strong>警告：</strong>
          この操作により以下のデータが完全に削除されます：
          <ul>
            <li>全てのサブカテゴリ</li>
            <li>全てのトピックと投稿</li>
            <li>全てのメンバーシップ情報</li>
            <li>全ての設定とカスタマイズ</li>
          </ul>
        </div>
        <p>
          削除を確認するため、コミュニティ名 
          <strong class="community-name-confirm"></strong> 
          を入力してください：
        </p>
        <input type="text" 
               class="form-control" 
               id="confirm-community-name" 
               placeholder="コミュニティ名を入力">
      </div>
      <div class="modal-footer">
        <button type="button" 
                class="btn btn-default" 
                data-dismiss="modal">
          キャンセル
        </button>
        <button type="button" 
                class="btn btn-danger" 
                id="confirm-delete-btn" 
                disabled>
          削除を実行
        </button>
      </div>
    </div>
  </div>
</div>
```

## テスト項目

1. **権限テスト**
   - オーナーのみが削除可能
   - 他のロールでは表示されない

2. **削除プロセステスト**
   - 確認フローの動作確認
   - キャンセル時の処理

3. **データ整合性テスト**
   - 全関連データの削除確認
   - 他のコミュニティへの影響なし

4. **エラーケーステスト**
   - ネットワークエラー時の処理
   - 部分的削除の防止

## 実装チェックリスト

- [ ] デンジャーゾーンUIの実装
- [ ] 削除確認フローの実装
- [ ] サーバー側削除処理の実装
- [ ] データクリーンアップ処理の実装
- [ ] エラーハンドリングの実装
- [ ] 監査ログの実装
- [ ] テストケースの作成と実行
- [ ] ドキュメントの更新