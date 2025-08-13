# Task 06g: コミュニティ作成時のモデレーション権限自動付与

## 概要

コミュニティ（親カテゴリー）作成時に、owner/managerグループに対して当該コミュニティへのモデレート権限（'read', 'topics:read', 'moderate'）を自動的に付与する機能を実装する。

## 対象

- [ ] 既存の `plugins/nodebb-plugin-caiz/libs/community/core.js` の `createCommunity` 関数に権限付与機能を追加

## 詳細仕様

### 1. core.js への機能追加

既存の `plugins/nodebb-plugin-caiz/libs/community/core.js` の `createCommunity` 関数を拡張して、以下の処理を追加する：

```javascript
// plugins/nodebb-plugin-caiz/libs/community/core.js の createCommunity 関数内に追加

async function createCommunity(uid, { name, description }) {
    // ... 既存のコミュニティ作成処理 ...
    
    // 新機能: モデレーション権限の追加付与
    const moderationPrivileges = ['read', 'topics:read', 'moderate'];
    
    // Owner グループへのモデレーション権限付与
    // 既存: await Privileges.categories.give(ownerPrivileges, cid, ownerGroupName);
    // 追加: モデレーション権限が含まれているか確認し、なければ追加
    
    // Manager グループへのモデレーション権限付与（新規追加）
    await Privileges.categories.give(moderationPrivileges, cid, managerGroupName);
    
    // 子カテゴリへの権限継承
    // Implementation: Apply same moderation privileges to child categories
}
```

## 実装上の注意点

### 既存コードとの統合
- 既存の `createCommunity` 関数のロジックを壊さないように注意
- 既存の権限設定処理の後にモデレーション権限を追加
- 既存のグループ作成処理を活用

### 権限の階層構造
- **Owner**: 完全な管理権限（既存コードで設定済み）
- **Manager**: モデレーション権限を新規追加（'read', 'topics:read', 'moderate'）
- **Member**: 基本的な参加権限（既存コードで設定済み）
- **Banned**: アクセス禁止（既存コードで設定済み）


### エラーハンドリング
- 権限付与失敗時は既存のエラーハンドリングに従う
- winston によるログ記録を継続

## 成功条件

- コミュニティ作成時に、managerグループにモデレーション権限が付与される
- 子カテゴリにも同様の権限が継承される
- 既存の権限設定を破壊しない
- 権限付与が winston ログに記録される

