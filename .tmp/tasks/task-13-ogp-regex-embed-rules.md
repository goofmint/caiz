# Task 13: OGP正規表現埋め込みルール機能

## 概要

NodeBB OGPプラグインに正規表現ベースの柔軟な埋め込みルール機能を追加する。管理者が正規表現パターンとテンプレートを設定することで、カスタム埋め込み表示を実現する。

## 機能要件

### 管理画面機能
- [ ] 埋め込みルールの一覧表示
- [ ] 新規埋め込みルール作成
- [ ] 既存ルール編集
- [ ] ルール削除
- [ ] ルールの有効/無効切り替え
- [ ] ルール実行順序の設定

### 埋め込みルール設定項目
- [ ] ルール名称（管理用）
- [ ] 正規表現パターン
- [ ] テンプレート文字列
- [ ] ルール有効/無効フラグ
- [ ] 実行優先度

### 処理ロジック
- [ ] URL解析時の正規表現マッチング
- [ ] マッチグループの抽出
- [ ] テンプレートへの変数置換
- [ ] 複数ルールの優先度処理

## 技術仕様

### データベーススキーマ

```javascript
// Collection: ogp_embed_rules
{
  ruleId: String,          // ユニークID
  name: String,            // ルール名称
  pattern: String,         // 正規表現パターン
  template: String,        // 埋め込みテンプレート
  enabled: Boolean,        // 有効/無効
  priority: Number,        // 実行優先度（数値が小さいほど高優先度）
  createdAt: Date,         // 作成日時
  updatedAt: Date          // 更新日時
}
```

### APIエンドポイント

```javascript
// 管理用REST API
class EmbedRulesAPI {
  /**
   * 全ルール取得
   * GET /api/admin/plugins/ogp-embed/rules
   */
  async getRules(req, res) {
    // ルール一覧を優先度順で返却
  }

  /**
   * ルール作成
   * POST /api/admin/plugins/ogp-embed/rules
   */
  async createRule(req, res) {
    // 新規ルール作成・バリデーション
  }

  /**
   * ルール更新
   * PUT /api/admin/plugins/ogp-embed/rules/:ruleId
   */
  async updateRule(req, res) {
    // 既存ルール更新・バリデーション
  }

  /**
   * ルール削除
   * DELETE /api/admin/plugins/ogp-embed/rules/:ruleId
   */
  async deleteRule(req, res) {
    // ルール削除処理
  }
}
```

### コア処理ロジック

```javascript
class RegexEmbedProcessor {
  /**
   * URL処理：正規表現ルールによる埋め込み変換
   * @param {string} url - 処理対象URL
   * @returns {Object|null} - 埋め込み結果またはnull
   */
  async processURL(url) {
    // 1. 有効ルールを優先度順で取得
    // 2. 各ルールの正規表現でURL照合
    // 3. マッチした場合：グループ抽出してテンプレート変換
    // 4. 最初にマッチしたルールの結果を返却
  }

  /**
   * テンプレート変数置換
   * @param {string} template - テンプレート文字列
   * @param {Array} matches - 正規表現マッチ結果
   * @returns {string} - 変換後HTML
   */
  replaceTemplate(template, matches) {
    // $1, $2, ... の形式で置換変数を処理
    // エスケープ処理適用
  }

  /**
   * 正規表現バリデーション
   * @param {string} pattern - 正規表現パターン
   * @returns {boolean} - 有効性判定
   */
  validatePattern(pattern) {
    // 正規表現の構文チェック
    // 安全性検証（ReDoS対策等）
  }
}
```

### 管理画面UI構造

```javascript
// 管理画面コンポーネント
class EmbedRulesManagement {
  /**
   * ルール一覧テーブル
   */
  renderRulesList() {
    // データテーブル（ソート・フィルタ機能付き）
    // アクション（編集・削除・有効切替）
  }

  /**
   * ルール作成/編集フォーム
   */
  renderRuleForm() {
    // フォーム要素（名称、パターン、テンプレート等）
    // リアルタイムバリデーション
    // プレビュー機能
  }

  /**
   * テンプレートエディタ
   */
  renderTemplateEditor() {
    // シンタックスハイライト
    // 変数補完機能
    // プレビュー表示
  }
}
```

### セキュリティ考慮事項

- 正規表現パターンのReDoS（Regular Expression Denial of Service）対策
- テンプレート内でのXSS防止（適切なエスケープ処理）
- 管理者権限の適切な検証
- 入力値のサニタイズとバリデーション

### パフォーマンス考慮事項

- ルールキャッシュ機能
- 正規表現コンパイル結果のメモ化
- 大量ルール処理時の効率化
- データベースインデックス最適化

## ファイル構成

```
plugins/nodebb-plugin-ogp-embed/
├── lib/
│   ├── rules/
│   │   ├── manager.js      # ルール管理
│   │   ├── processor.js    # 処理エンジン
│   │   └── validator.js    # バリデータ
│   └── admin/
│       └── rules.js        # 管理用API
├── static/
│   └── admin/
│       ├── rules.js        # 管理画面JS
│       └── rules.css       # 管理画面CSS
└── templates/
    └── admin/
        └── rules.tpl       # 管理画面テンプレート
```

## 使用例

### YouTube動画の短縮URL対応
```javascript
// 正規表現パターン
"^https?://youtu\\.be/([a-zA-Z0-9_-]{11})$"

// テンプレート
"<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/$1\" frameborder=\"0\" allowfullscreen></iframe>"
```

### Twitter投稿の埋め込み
```javascript
// 正規表現パターン
"^https?://(?:www\\.|mobile\\.)?twitter\\.com/\\w+/status/(\\d+)"

// テンプレート
"<blockquote class=\"twitter-tweet\"><a href=\"https://twitter.com/twitter/status/$1\"></a></blockquote>"
```