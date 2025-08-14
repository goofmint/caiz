# タスク06: コミュニティ作成時のデフォルトのサブカテゴリー設定変更

## 概要

現在、コミュニティ作成時にNodeBBのデフォルトカテゴリーファイル（`app/install/data/categories.json`）から自動的にサブカテゴリーが作成されるが、これをCaizプラットフォーム向けにカスタマイズする必要がある。

## 現状の問題

1. **デフォルトサブカテゴリーの内容が汎用的すぎる**
   - "Announcements"、"General Discussion"、"Blogs"、"Comments & Feedback"
   - 説明文が英語で、日本語ユーザーには不親切
   - アイコンがCaizのブランディングと一致していない

2. **プラットフォーム固有のニーズに対応していない**
   - Caizユーザーの典型的な利用パターンに最適化されていない
   - コミュニティの種類（企業、趣味、学習等）に関係なく同一の構成

## 目標

コミュニティ作成時に、Caizプラットフォームに適したデフォルトサブカテゴリーを自動作成する。

## 技術仕様

### 影響範囲

- **ファイル**: `plugins/nodebb-plugin-caiz/libs/community/core.js:100-102`
- **関数**: `createCommunity()`
- **現在の実装**:
```javascript
// Create child categories in the community
await Promise.all(initialCategories.map((category) => {
  return data.createCategory({ ...category, parentCid: cid, cloneFromCid: cid });
}));
```

### 提案する変更

#### 1. カスタムカテゴリー定義の作成

**ファイル**: `plugins/nodebb-plugin-caiz/data/default-subcategories.json`

```json
[
  {
    "name": "お知らせ",
    "description": "コミュニティからの重要なお知らせ",
    "descriptionParsed": "<p>コミュニティからの重要なお知らせ</p>\n",
    "bgColor": "#2563eb",
    "color": "#ffffff",
    "icon": "fa-megaphone",
    "order": 1
  },
  {
    "name": "雑談・交流",
    "description": "メンバー同士の自由な話し合いの場",
    "descriptionParsed": "<p>メンバー同士の自由な話し合いの場</p>\n",
    "bgColor": "#10b981",
    "color": "#ffffff", 
    "icon": "fa-comments",
    "order": 2
  },
  {
    "name": "質問・相談",
    "description": "困ったことがあれば気軽にご相談ください",
    "descriptionParsed": "<p>困ったことがあれば気軽にご相談ください</p>\n",
    "bgColor": "#f59e0b",
    "color": "#ffffff",
    "icon": "fa-question-circle",
    "order": 3
  },
  {
    "name": "資料・情報共有",
    "description": "有用な情報や資料の共有場所",
    "descriptionParsed": "<p>有用な情報や資料の共有場所</p>\n",
    "bgColor": "#8b5cf6",
    "color": "#ffffff",
    "icon": "fa-book",
    "order": 4
  }
]
```

#### 2. core.jsの修正

```javascript
// Before (line 3)
const initialCategories = require.main.require('./install/data/categories.json');

// After
const path = require('path');
const caizCategories = require(path.join(__dirname, '../../data/default-subcategories.json'));

// Before (lines 100-102)
await Promise.all(initialCategories.map((category) => {
  return data.createCategory({ ...category, parentCid: cid, cloneFromCid: cid });
}));

// After  
await Promise.all(caizCategories.map((category) => {
  return data.createCategory({ ...category, parentCid: cid, cloneFromCid: cid });
}));
```

#### 3. 設定可能性の追加（将来の拡張）

設定画面でデフォルトサブカテゴリーをカスタマイズできるインターフェースを提供:

```javascript
// 設定取得のインターフェース例
async function getDefaultSubcategories() {
  // 管理者設定から取得、なければデフォルトを使用
  const customCategories = await data.getObjectField('caiz:settings', 'defaultSubcategories');
  return customCategories ? JSON.parse(customCategories) : caizCategories;
}
```

#### 4. 多言語対応（将来の拡張）

言語設定に基づいて適切な言語のサブカテゴリーを選択:

```javascript
// 言語別カテゴリー定義の例
const categoryTranslations = {
  'ja': require('./default-subcategories-ja.json'),
  'en': require('./default-subcategories-en.json'),
  // ...
};

function getLocalizedCategories(locale = 'ja') {
  return categoryTranslations[locale] || categoryTranslations['ja'];
}
```

## 実装の考慮事項

### デザインガイドライン

1. **カラーパレット**: Caizブランドカラーに準拠
   - プライマリー: #2563eb (青)
   - セカンダリー: #10b981 (緑)
   - アクセント: #f59e0b (オレンジ)、#8b5cf6 (紫)

2. **アイコン選択**: FontAwesome 4.x系を使用
   - 直感的で分かりやすいアイコンを選択
   - ブランドイメージに合致する色調

3. **日本語コンテンツ**:
   - 簡潔で分かりやすい表現
   - 敬語は使わず、親しみやすいトーン

### 後方互換性

- 既存のコミュニティには影響しない
- 新規作成されるコミュニティのみが新しいデフォルトカテゴリーを使用

### テスト要件

1. **新規コミュニティ作成テスト**
   - 新しいデフォルトカテゴリーが正しく作成されること
   - カテゴリーの順序、色、アイコンが仕様通りであること

2. **権限テスト**
   - 各サブカテゴリーに適切な権限が設定されること
   - グループ権限の継承が正しく動作すること

## 実装手順

1. **デフォルトカテゴリーJSONファイルの作成**
   - `/plugins/nodebb-plugin-caiz/data/default-subcategories.json`

2. **core.jsの修正**
   - `require`文の変更
   - カテゴリー作成処理の更新

3. **テスト実行**
   - 新規コミュニティ作成の動作確認
   - サブカテゴリーの表示・権限確認

4. **ドキュメント更新**
   - README.mdに新機能の説明を追加
   - 設定方法の記載

## 将来の拡張可能性

1. **管理画面での設定**
   - デフォルトサブカテゴリーをGUIで編集可能に

2. **テンプレート機能**
   - コミュニティの種類別（企業、趣味、学習等）にテンプレートを用意

3. **多言語対応**
   - ユーザーの言語設定に応じた自動切り替え

4. **アイコンアップロード**
   - カスタムアイコンのアップロード機能