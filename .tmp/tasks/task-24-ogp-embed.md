# タスク24: OGP埋め込み機能

## 概要

投稿内のURLを解析し、Open Graph Protocol (OGP) メタデータを取得して、リッチなプレビューカードとして表示する機能を実装する。独立したNodeBBプラグイン `nodebb-plugin-ogp-embed` として開発する。

## 要件

### 機能要件
- 投稿内のURLを自動検出
  - 行の先頭にある場合のみ対象（インラインは除外）
  - Markdownフォーマットに対応。行頭に `[text](url)` は対象
- OGPメタデータの取得と解析
- プレビューカードのレンダリング
- キャッシュによるパフォーマンス最適化
- エラーハンドリングとフォールバック表示

### 非機能要件
- 外部サイトへのリクエストは非同期処理
- タイムアウト設定（デフォルト5秒）
- キャッシュ有効期限の設定可能
  - 強制キャッシュ更新のAPIを用意
- プライバシー保護（リファラー制御）

## 技術仕様

### プラグイン構成

```
nodebb-plugin-ogp-embed/
├── package.json
├── plugin.json
├── library.js
├── lib/
│   ├── parser.js       # OGP解析ロジック
│   ├── cache.js        # キャッシュ管理
│   └── renderer.js     # HTML生成
├── static/
│   ├── style.less      # スタイル定義
│   └── client.js       # クライアント側処理
└── templates/
    └── partials/
        └── ogp-card.tpl # カードテンプレート
```

### plugin.json

```json
{
  "id": "nodebb-plugin-ogp-embed",
  "name": "OGP Embed Plugin",
  "description": "Embed Open Graph Protocol previews in posts",
  "version": "1.0.0",
  "hooks": [
    {
      "hook": "filter:parse.raw",
      "method": "parseRaw"
    },
    {
      "hook": "filter:parse.post",
      "method": "parsePost"
    },
    {
      "hook": "action:plugin.activate",
      "method": "onActivate"
    }
  ],
  "less": [
    "static/style.less"
  ],
  "scripts": [
    "static/client.js"
  ]
}
```

### library.js - メインエントリポイント

```javascript
'use strict';

const parser = require('./lib/parser');
const cache = require('./lib/cache');
const renderer = require('./lib/renderer');

const plugin = {};

/**
 * プラグイン初期化
 */
plugin.onActivate = async function() {
    // キャッシュの初期化
    // 設定の読み込み
};

/**
 * 投稿パース前のフック
 * URLを検出してOGPデータ取得をスケジュール
 */
plugin.parseRaw = async function(data) {
    // URL検出ロジック
    // 非同期でOGPデータ取得
    // プレースホルダー挿入
    return data;
};

/**
 * 投稿パース後のフック
 * OGPカードのHTMLを生成
 */
plugin.parsePost = async function(data) {
    // プレースホルダーをOGPカードに置換
    // エラー時はフォールバック表示
    return data;
};

module.exports = plugin;
```

### lib/parser.js - OGP解析



```javascript
'use strict';

// ogp-parserをインポートして、解析まで行う
import ogp from 'ogp-parser'

const data = await ogp(url);
// 出力例
/*
{
    "title": "うきょう(@ukyoda)さん | Twitter",
    "ogp": {
        "al:ios:url": [
            "twitter://user?screen_name=ukyoda"
        ],
        "al:ios:app_store_id": [
            "333903271"
        ],
        "al:ios:app_name": [
            "Twitter"
        ],
        "al:android:url": [
            "twitter://user?screen_name=ukyoda"
        ],
        "al:android:package": [
            "com.twitter.android"
        ],
        "al:android:app_name": [
            "Twitter"
        ]
    },
    "seo": {
        "robots": [
            "NOODP"
        ],
        "description": [
            "うきょう (@ukyoda)さんの最新ツイート 独立系SIer。ビッグデータや機械学習を使ったシステム開発によく携わっています。 最近はPythonが多いですが、JavascriptとかPHPとかJavaとかC/C++での開発もやってます。 https://t.co/y8iW4rQ7lD ザクソン村"
        ],
        "msapplication-TileImage": [
            "//abs.twimg.com/favicons/win8-tile-144.png"
        ],
        "msapplication-TileColor": [
            "#00aced"
        ],
        "swift-page-name": [
            "profile"
        ],
        "swift-page-section": [
            "profile"
        ]
    },
    "oembed": {
        "url": "https://twitter.com/ukyoda",
        "title": "",
        "html": "<a class=\"twitter-timeline\" href=\"https://twitter.com/ukyoda?ref_src=twsrc%5Etfw\">Tweets by ukyoda</a>\n<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>\n",
        "width": null,
        "height": null,
        "type": "rich",
        "cache_age": "3153600000",
        "provider_name": "Twitter",
        "provider_url": "https://twitter.com",
        "version": "1.0"
    }
}
*/
```

### lib/cache.js - キャッシュ管理

```javascript
'use strict';

const db = require.main.require('./src/database');

class OGPCache {
    constructor() {
        this.ttl = 86400; // 24時間
    }

    /**
     * キャッシュから取得
     * @param {string} url
     * @returns {Object|null}
     */
    async get(url) {
        // RedisまたはNodeBBのDBからキャッシュ取得
        // 有効期限チェック
    }

    /**
     * キャッシュに保存
     * @param {string} url
     * @param {Object} data
     */
    async set(url, data) {
        // TTL付きでキャッシュ保存
        // エラーハンドリング
    }

    /**
     * キャッシュをクリア
     * @param {string} url
     */
    async clear(url) {
        // 特定URLのキャッシュ削除
    }
}

module.exports = new OGPCache();
```

### lib/renderer.js - HTML生成

```javascript
'use strict';

const nconf = require.main.require('nconf');
const templates = require.main.require('benchpressjs');

class OGPRenderer {
    /**
     * OGPカードのHTML生成
     * @param {Object} ogpData
     * @returns {string} HTML
     */
    async render(ogpData) {
        // テンプレートにデータをバインド
        // セキュリティ（XSS対策）
        // レスポンシブ対応
    }

    /**
     * フォールバック表示生成
     * @param {string} url
     * @returns {string} HTML
     */
    renderFallback(url) {
        // シンプルなリンク表示
        // エラーメッセージなし
    }

    /**
     * プレースホルダー生成
     * @param {string} url
     * @returns {string} HTML
     */
    renderPlaceholder(url) {
        // ローディング表示
        // data属性にURL保存
    }
}

module.exports = new OGPRenderer();
```

### templates/partials/ogp-card.tpl

Bootstrapのデザインに準拠して行う。スタイル設定は必要最低限とする。

```html
<div class="ogp-card" data-url="{url}">
    <!-- IF image -->
    <div class="ogp-card-image">
        <img src="{image}" alt="{title}" loading="lazy">
    </div>
    <!-- ENDIF image -->
    <div class="ogp-card-content">
        <div class="ogp-card-title">
            <a href="{url}" target="_blank" rel="noopener noreferrer">
                {title}
            </a>
        </div>
        <!-- IF description -->
        <div class="ogp-card-description">
            {description}
        </div>
        <!-- ENDIF description -->
        <div class="ogp-card-domain">
            <img src="{favicon}" alt="" class="ogp-card-favicon">
            <span>{domain}</span>
        </div>
    </div>
</div>
```

### static/client.js

```javascript
'use strict';

$(document).ready(function() {
    /**
     * 動的に追加されたコンテンツのOGP埋め込み処理
     */
    $(window).on('action:posts.loaded', function() {
        // プレースホルダーを検出
        // AJAXでOGPデータ取得
        // DOMを更新
    });

    /**
     * リアルタイムプレビュー対応
     */
    $(window).on('action:composer.preview', function() {
        // コンポーザーのプレビューでOGP表示
    });
});
```

## 設定項目

### 管理画面設定

```javascript
{
    // 基本設定
    enabled: true,
    
    // パフォーマンス
    timeout: 5000,           // タイムアウト（ミリ秒）
    cacheTTL: 86400,        // キャッシュ有効期限（秒）
    maxConcurrent: 3,       // 同時リクエスト数
    
    // 表示設定
    maxDescriptionLength: 150,
    showFavicon: true,
    openInNewTab: true,
    
    // セキュリティ
    whitelist: [],          // 許可するドメイン
    blacklist: [],          // 拒否するドメイン
    userAgentString: '',    // カスタムUser-Agent
    
    // デバッグ
    debug: false
}
```

## セキュリティ考慮事項

1. **SSRF対策**
   - プライベートIPアドレスへのアクセス制限
   - リダイレクト回数制限
   - タイムアウト設定

2. **XSS対策**
   - HTMLエスケープ処理
   - Content Security Policy対応
   - サニタイズ処理

3. **プライバシー保護**
   - リファラー制御
   - ユーザーエージェント匿名化
   - IPアドレスログ制限

## パフォーマンス最適化

1. **キャッシュ戦略**
   - Redis/Memory Cache利用
   - TTL設定による自動更新
   - LRUアルゴリズム

2. **非同期処理**
   - Queue実装
   - バッチ処理
   - レート制限

3. **画像最適化**
   - 遅延読み込み
   - サムネイル生成
   - WebP対応

## テスト項目

- URL検出精度
- OGPタグ解析
- キャッシュ動作
- エラーハンドリング
- XSS脆弱性
- パフォーマンス測定
- モバイル表示
- ダークモード対応
