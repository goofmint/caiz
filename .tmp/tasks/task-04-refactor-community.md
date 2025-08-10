# タスク04: community.js リファクタリング設計書

## 現状分析

`plugins/nodebb-plugin-caiz/libs/community.js` は現在1011行のコードを含んでおり、以下の責務を持っています：

1. **コミュニティ管理** (行 32-145)
   - コミュニティの作成
   - グループの作成と設定
   - 権限設定

2. **ユーザーとコミュニティの関係管理** (行 54-244)
   - ユーザーのコミュニティ取得
   - フォロー/アンフォロー機能
   - フォロー状態の確認

3. **コミュニティ情報管理** (行 245-397)
   - オーナー権限確認
   - コミュニティデータの取得と更新

4. **サブカテゴリ管理** (行 399-665)
   - サブカテゴリの取得、作成、更新、削除
   - サブカテゴリの並び替え

5. **メンバー管理** (行 668-988)
   - メンバー一覧取得
   - メンバーの追加、削除
   - ロール変更（オーナー、マネージャー、メンバー、バン）

6. **その他のヘルパー機能** (行 990-1009)
   - カスタムリンクの生成
   - ヘッダーリンクの追加

## リファクタリング方針

### ファイル分割構成

```
plugins/nodebb-plugin-caiz/libs/
├── community.js              # メインエントリーポイント（コントローラー）
├── community/
│   ├── index.js              # パブリックAPIの再エクスポート
│   ├── core.js               # コミュニティ作成・基本操作
│   ├── members.js            # メンバー管理機能
│   ├── categories.js        # サブカテゴリ管理機能
│   ├── permissions.js       # 権限チェック・グループ管理
│   ├── helpers.js            # ヘルパー関数・ユーティリティ
│   ├── data.js               # データベースアクセス層
│   └── shared/               # 共通モジュール
│       ├── constants.js     # 定数定義
│       ├── schemas.js       # スキーマ定義
│       └── types.js         # 型定義
```

### 各ファイルの責務

#### 1. `community.js` (メインファイル)
- WebSocketハンドラーのエントリーポイント
- 各モジュールへのルーティング
- HTTPリクエストハンドラー（Index）

#### 2. `community/core.js`
- `createCommunity` - コミュニティ作成
- `getUserCommunities` - ユーザーのコミュニティ取得
- `Follow` / `Unfollow` - フォロー管理
- `IsFollowed` - フォロー状態確認
- `GetCommunityData` / `UpdateCommunityData` - コミュニティ情報管理

#### 3. `community/members.js`
- `GetMembers` - メンバー一覧取得
- `AddMember` - メンバー追加
- `ChangeMemberRole` - ロール変更
- `RemoveMember` - メンバー削除
- `getUserRole` - ユーザーロール取得

#### 4. `community/categories.js`
- `GetSubCategories` - サブカテゴリ一覧取得
- `CreateSubCategory` - サブカテゴリ作成
- `UpdateSubCategory` - サブカテゴリ更新
- `DeleteSubCategory` - サブカテゴリ削除
- `ReorderSubCategories` - サブカテゴリ並び替え

#### 5. `community/permissions.js`
- `IsCommunityOwner` - オーナー権限確認
- `createCommunityGroup` - グループ作成
- `checkOwnership` - オーナー権限チェック（内部用）
- `checkManagerPermission` - マネージャー権限チェック（内部用）

#### 6. `community/helpers.js`
- `getCommunity` - コミュニティ取得ヘルパー
- `customizeIndexLink` - リンクカスタマイズ
- `createCommunityLink` - ヘッダーリンク追加

## 実装チェックリスト

- [ ] community/shared/constants.js の作成
- [ ] community/shared/schemas.js の作成
- [ ] community/shared/types.js の作成
- [ ] community/data.js の作成
- [ ] community/core.js の作成
- [ ] community/members.js の作成
- [ ] community/categories.js の作成
- [ ] community/permissions.js の作成
- [ ] community/helpers.js の作成
- [ ] community/index.js の作成（パブリックAPI再エクスポート）
- [ ] community.js のリファクタリング（ルーティングのみ残す）
- [ ] 各モジュール間の依存関係の整理
- [ ] テストの実行と動作確認

## 注意事項

1. **後方互換性の維持**
   - WebSocketのイベント名は変更しない
   - 既存のAPIインターフェースは維持する

### 後方互換性マトリックス

| 既存のAPI | タイプ | 新しいモジュール/ハンドラー | ペイロード形式の不変条件 |
|-----------|--------|---------------------------|------------------------|
| `plugins.community.create` | WebSocket | `core.js/createCommunity` | `{name: string, description?: string}` |
| `plugins.community.user` | WebSocket | `core.js/getUserCommunities` | なし（uidはソケットから取得） |
| `plugins.community.follow` | WebSocket | `core.js/Follow` | `{cid: number}` |
| `plugins.community.unfollow` | WebSocket | `core.js/Unfollow` | `{cid: number}` |
| `plugins.community.isFollowed` | WebSocket | `core.js/IsFollowed` | `{cid: number}` |
| `plugins.community.isCommunityOwner` | WebSocket | `permissions.js/IsCommunityOwner` | `{cid: number}` |
| `plugins.community.getCommunityData` | WebSocket | `core.js/GetCommunityData` | `{cid: number}` |
| `plugins.community.updateCommunityData` | WebSocket | `core.js/UpdateCommunityData` | `{cid, name, description, backgroundImage?, icon?, color?, bgColor?}` |
| `plugins.community.getSubCategories` | WebSocket | `categories.js/GetSubCategories` | `{cid: number}` |
| `plugins.community.createSubCategory` | WebSocket | `categories.js/CreateSubCategory` | `{parentCid, name, description?, icon?, color?, bgColor?}` |
| `plugins.community.updateSubCategory` | WebSocket | `categories.js/UpdateSubCategory` | `{cid, parentCid, name, description?, icon?, color?, bgColor?}` |
| `plugins.community.deleteSubCategory` | WebSocket | `categories.js/DeleteSubCategory` | `{cid: number, parentCid: number}` |
| `plugins.community.reorderSubCategories` | WebSocket | `categories.js/ReorderSubCategories` | `{parentCid: number, categoryIds: number[]}` |
| `plugins.community.getMembers` | WebSocket | `members.js/GetMembers` | `{cid: number}` |
| `plugins.community.addMember` | WebSocket | `members.js/AddMember` | `{cid: number, username: string}` |
| `plugins.community.changeMemberRole` | WebSocket | `members.js/ChangeMemberRole` | `{cid, targetUid, newRole: 'owner'|'manager'|'member'|'banned'}` |
| `plugins.community.removeMember` | WebSocket | `members.js/RemoveMember` | `{cid: number, targetUid: number}` |
| `/:handle` | HTTP GET | `community.js/Index` | URLパラメータ `:handle` |

2. **モジュール間の依存関係**
   - 循環参照を避けるため、以下の構造を採用：
     - `community/shared/` フォルダに共通要素を配置
       - `constants.js` - 定数定義（ロール名、グループ名パターンなど）
       - `schemas.js` - データスキーマ定義
       - `types.js` - 共通の型定義
     - `community/data.js` - データベースアクセス層
       - 全モジュールから利用される薄いデータアクセス層
       - db操作のラッパー関数を提供
     - `community/index.js` - パブリックAPIの再エクスポート
       - 各モジュールの公開関数を一元的にエクスポート
       - 深いインポートパスを防ぐ

3. **エラーハンドリング**
   - 各モジュールで適切なエラーハンドリングを維持
   - ログ出力の一貫性を保つ

4. **パフォーマンス**
   - データベースアクセスの最適化を維持
   - 不要な重複クエリを避ける