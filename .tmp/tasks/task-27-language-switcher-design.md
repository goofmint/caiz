# 言語切替ドロップダウンUI設計

## 概要
.sticky-top要素内に言語切替ドロップダウンを追加する。現在表示中の言語を選択状態として表示し、他言語への切替を可能にする。

## 配置場所
- **配置**: `.sticky-top` 要素の右側
- **位置**: 既存のナビゲーション要素に影響を与えない位置

## UI仕様

### ドロップダウン表示
```
[Japanese ▼]  ← 現在の言語名を表示（選択状態）
```

### 展開時表示
```
[Japanese ▼]
├ English
├ 中文(简体)
├ हिन्दी
├ Español
├ العربية
├ Français
├ বাংলা
├ Русский
├ Português
├ اردو
├ Bahasa Indonesia
├ Deutsch
├ [Japanese] ← 選択中
├ Filipino
├ Türkçe
├ 한국어
├ فارسی
├ Kiswahili
├ Hausa
└ Italiano
```

## 技術仕様

### 言語一覧
対応言語（20言語）:
- en: "English"
- zh-CN: "中文(简体)"
- hi: "हिन्दी"
- es: "Español"
- ar: "العربية"
- fr: "Français"
- bn: "বাংলা"
- ru: "Русский"
- pt: "Português"
- ur: "اردو"
- id: "Bahasa Indonesia"
- de: "Deutsch"
- ja: "Japanese"
- fil: "Filipino"
- tr: "Türkçe"
- ko: "한국어"
- fa: "فارسی"
- sw: "Kiswahili"
- ha: "Hausa"
- it: "Italiano"

### 動作仕様

#### 言語検出ロジック

1. URLクエリパラメータ (`?locale=xx`)
2. ユーザー設定
3. ブラウザ言語設定
4. デフォルト（英語）

#### 切替動作
- 各言語項目はリンク形式
- クリックで `?locale={lang_code}` パラメータ付きで現在ページをリロード
- 例: `?locale=en`, `?locale=zh-CN`

#### 表示状態
- 現在の言語は選択状態（背景色変更等）で表示
- 選択中言語名はボタンラベルに表示

## DOM構造設計

国際化処理はNodeBB標準の方法で実現。

```html
<div class="language-switcher dropdown">
  <button class="btn btn-link dropdown-toggle" type="button" id="languageDropdown" data-bs-toggle="dropdown">
    <i class="fa fa-globe"></i>
    <span class="language-name">Japanese</span>
  </button>
  <ul class="dropdown-menu dropdown-menu-end">
    <li><a class="dropdown-item" href="?locale=en">English</a></li>
    <li><a class="dropdown-item" href="?locale=zh-CN">中文(简体)</a></li>
    <!-- ... 他の言語 ... -->
    <li><a class="dropdown-item active" href="?locale=ja">Japanese</a></li>
    <!-- ... 残りの言語 ... -->
  </ul>
</div>
```

## CSS設計

Bootstrap5のドロップダウンコンポーネントを活用。

```css
.language-switcher {
  margin-left: auto; /* 右側配置 */
}

.language-switcher .dropdown-toggle {
  color: inherit;
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
}

.language-switcher .dropdown-toggle:hover,
.language-switcher .dropdown-toggle:focus {
  color: var(--bs-link-hover-color);
}

.language-switcher .dropdown-item.active {
  background-color: var(--bs-primary);
  color: var(--bs-primary-contrast);
}

.language-switcher .fa-globe {
  margin-right: 0.5rem;
}
```

## 実装ファイル

### 修正が必要なファイル
1. **テンプレートファイル**: `.sticky-top` を含むヘッダーテンプレート
2. **library.js**: 現在言語の検出とテンプレートデータ設定
3. **静的ファイル**: CSS追加

### プラグインフック活用
- `filter:middleware.renderHeader`を活用して言語情報をテンプレートに渡す
- 既存の言語検出ロジックを再利用

## 注意事項
- Bootstrap 5のドロップダウンコンポーネントを使用
- モバイル対応（レスポンシブ）
- アクセシビリティ（ARIA属性）を考慮
- 既存の.sticky-topレイアウトに影響を与えない
- パフォーマンス: 言語検出は既存ロジックを活用

## 実装順序
1. DOM構造とCSS実装
2. 現在言語の動的表示
3. 言語切替リンクはサーバーサイドで生成
4. モバイル対応とアクセシビリティ改善