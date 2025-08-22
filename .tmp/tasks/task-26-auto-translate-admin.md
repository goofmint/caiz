# タスク26: 自動翻訳プラグインの管理画面実装

## 概要
NodeBB向けの自動翻訳プラグインに管理画面を追加し、翻訳プロンプトの編集機能を提供する。

## 完了状況
- [x] 設計ドキュメント作成
- [ ] プラグイン基盤の実装
- [ ] 管理画面UI の実装
- [ ] プロンプトエディターの実装
- [ ] 設定保存・復元機能の実装
- [ ] API接続テスト機能の実装

## 技術仕様

### プラグイン構成
```
plugins/nodebb-plugin-auto-translate/
├── plugin.json              # プラグイン設定
├── library.js               # メインエントリーポイント
├── package.json             # npm依存関係
├── README.md                # プラグインドキュメント
├── languages/               # 翻訳ファイル
│   ├── ja/
│   │   └── auto-translate.json
│   └── en-US/
│       └── auto-translate.json
├── static/                  # フロントエンド
│   ├── admin.js            # 管理画面JavaScript
│   └── style.css           # 管理画面スタイル
├── templates/              # テンプレート
│   └── admin/
│       └── plugins/
│           └── auto-translate/
│               └── settings.tpl
└── lib/                    # バックエンドロジック
    ├── config/
    │   └── settings.js     # 設定管理
    ├── admin/
    │   └── routes.js       # 管理画面ルート
    └── translation/
        ├── prompt-manager.js  # プロンプト管理
        ├── api-client.js      # Gemini API クライアント
        └── validator.js       # 入力検証
```

### 管理画面機能

#### 1. プロンプト設定セクション
```javascript
// プロンプト編集フォーム
interface PromptSettings {
    systemPrompt: string;           // システムプロンプト
    translationInstruction: string; // 翻訳指示
    contextPreservation: string;   // 文脈保持指示
    outputFormat: string;          // 出力形式指示
}
```

#### 2. API設定セクション
```javascript
// API接続設定
interface ApiSettings {
    geminiApiKey: string;      // Gemini API キー
    model: string;             // 使用モデル (gemini-pro, gemini-pro-vision)
    maxTokens: number;         // 最大トークン数
    temperature: number;       // 創造性パラメータ
    timeout: number;          // タイムアウト時間(秒)
}
```

#### 3. 対応言語設定
```javascript
// 翻訳対応言語
interface LanguageSettings {
    supportedLanguages: string[];  // 対応言語コード配列
    defaultLanguage: string;       // デフォルト言語
    autoDetection: boolean;        // 言語自動検出
}
```

### フロントエンド実装

#### 管理画面レイアウト
```html
<!-- templates/admin/plugins/auto-translate/settings.tpl -->
<div class="auto-translate-admin">
    <h2>自動翻訳設定</h2>
    
    <!-- プロンプト設定タブ -->
    <div class="tab-content">
        <div class="prompt-settings">
            <h3>翻訳プロンプト設定</h3>
            <!-- プロンプトエディター -->
        </div>
        
        <div class="api-settings">
            <h3>Gemini API設定</h3>
            <!-- API設定フォーム -->
        </div>
        
        <div class="language-settings">
            <h3>言語設定</h3>
            <!-- 対応言語選択 -->
        </div>
    </div>
    
    <!-- 保存・テストボタン -->
    <div class="action-buttons">
        <button class="btn btn-primary">設定を保存</button>
        <button class="btn btn-outline-secondary">接続テスト</button>
    </div>
</div>
```

#### JavaScript機能
```javascript
// static/admin.js - 管理画面制御
class AutoTranslateAdmin {
    init() {
        // タブ切り替え機能
        // フォーム送信処理
        // プロンプトプレビュー機能
        // API接続テスト機能
    }
    
    saveSettings() {
        // 設定をWebSocket経由で保存
    }
    
    testConnection() {
        // Gemini API接続テスト
    }
    
    previewPrompt() {
        // プロンプトのプレビュー表示
    }
}
```

### バックエンド実装

#### 設定管理
```javascript
// lib/config/settings.js - 設定の保存・読み込み
class SettingsManager {
    async getSettings() {
        // データベースから設定を読み込み
    }
    
    async saveSettings(settings) {
        // 設定をデータベースに保存
        // バリデーション実行
    }
    
    async validateSettings(settings) {
        // 設定値の検証
    }
}
```

#### プロンプト管理
```javascript
// lib/translation/prompt-manager.js - プロンプト構築
class PromptManager {
    buildTranslationPrompt(content, targetLang, sourceLang) {
        // 設定されたプロンプトテンプレートから
        // 実際の翻訳プロンプトを構築
    }
    
    validatePromptTemplate(template) {
        // プロンプトテンプレートの検証
    }
}
```

#### API クライアント
```javascript
// lib/translation/api-client.js - Gemini API クライアント
class GeminiApiClient {
    async testConnection(apiKey) {
        // API接続テスト
    }
    
    async translate(prompt, settings) {
        // 翻訳リクエストの実行
    }
}
```

### セキュリティ考慮事項

1. **APIキーの暗号化保存**
   - データベース内でAPIキーを暗号化
   - 管理画面での表示時はマスク処理

2. **入力検証**
   - プロンプトテンプレートのサニタイズ
   - 数値設定の範囲チェック
   - XSS対策

3. **権限制御**
   - 管理者のみアクセス可能
   - Socket.IO接続時の権限確認

### データベーススキーマ

#### 設定テーブル
```sql
-- auto_translate_settings テーブル
{
    key: 'auto-translate:settings',
    value: {
        prompts: {
            systemPrompt: string,
            translationInstruction: string,
            contextPreservation: string,
            outputFormat: string
        },
        api: {
            geminiApiKey: string,  // 暗号化済み
            model: string,
            maxTokens: number,
            temperature: number,
            timeout: number
        },
        languages: {
            supportedLanguages: string[],
            defaultLanguage: string,
            autoDetection: boolean
        }
    }
}
```

## 実装フェーズ

### フェーズ1: 基盤実装
- プラグイン基本構造の作成
- 管理画面ルートの設定
- 基本的な設定保存・読み込み機能

### フェーズ2: プロンプト編集機能
- プロンプトエディターUI
- プロンプトテンプレートの管理
- プレビュー機能

### フェーズ3: API統合
- Gemini API クライアント実装
- 接続テスト機能
- エラーハンドリング

### フェーズ4: 高度な機能
- バッチ翻訳機能
- 翻訳履歴の管理
- パフォーマンス最適化

## 品質保証

### テスト項目
- [ ] 管理画面の表示確認
- [ ] 設定保存・読み込み機能
- [ ] プロンプト編集機能
- [ ] API接続テスト
- [ ] セキュリティチェック
- [ ] パフォーマンステスト

### 検証環境
- NodeBB最新版での動作確認
- 複数ブラウザでの互換性テスト
- レスポンシブデザインの確認