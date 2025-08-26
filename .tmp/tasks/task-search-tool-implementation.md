# 検索ツールの中身

## 概要
MCPサーバーのsearchツールに実際の検索機能を実装する。NodeBBのトピック、投稿、ユーザーを対象とした全文検索を提供し、MCP仕様に準拠した結果形式で返却する。

## 実装対象

### 1. 検索実行インターフェース

#### 検索実行関数
```javascript
async function executeSearch(query, category, limit) {
    // NodeBBの内部検索APIを使用
    // カテゴリ別フィルタリング（topics、posts、users）
    // 結果の正規化とフォーマット
    // MCP仕様準拠の結果構造を返却
}
```

#### 検索結果型定義
```javascript
interface SearchResult {
    type: 'topic' | 'post' | 'user';
    id: string;
    title: string;
    content: string;
    score: number;
    metadata: {
        author?: string;
        category?: string;
        timestamp?: string;
        url?: string;
    };
}
```

### 2. NodeBB検索API統合

#### トピック検索
```javascript
async function searchTopics(query, limit) {
    // NodeBB Topics.search() API使用
    // タイトル・内容での全文検索
    // カテゴリ情報・作成者情報付加
    // パーミッションチェック（閲覧可能コンテンツのみ）
}
```

#### 投稿検索
```javascript
async function searchPosts(query, limit) {
    // NodeBB Posts.search() API使用
    // 投稿内容での全文検索
    // 親トピック情報付加
    // 削除・非公開投稿の除外
}
```

#### ユーザー検索
```javascript
async function searchUsers(query, limit) {
    // NodeBB User.search() API使用
    // ユーザー名・表示名での検索
    // アクティブユーザーのみ対象
    // プライバシー設定考慮
}
```

### 3. 権限・セキュリティチェック

#### コンテンツアクセス権限
```javascript
async function checkContentAccess(userId, content) {
    // リクエストユーザーのアクセス権限確認
    // プライベートカテゴリの除外
    // モデレーション状態の考慮
    // バン・ミュート状態のチェック
}
```

#### 検索クエリサニタイゼーション
```javascript
function sanitizeSearchQuery(query) {
    // SQLインジェクション対策
    // 不正文字のエスケープ
    // クエリ長の制限（最大500文字）
    // 特殊文字の適切な処理
}
```

### 4. 結果フォーマット・ページング

#### MCP準拠結果構造
```javascript
function formatSearchResults(results, query, category, limit) {
    return {
        content: [
            {
                type: 'text',
                text: generateSearchSummary(results, query)
            },
            ...results.map(result => ({
                type: 'resource',
                resource: {
                    uri: result.url,
                    name: result.title,
                    description: result.content,
                    mimeType: 'text/html'
                },
                text: formatResultText(result)
            }))
        ],
        isError: false
    };
}
```

#### 結果サマリー生成
```javascript
function generateSearchSummary(results, query) {
    // 検索キーワードのハイライト
    // 見つかった結果数の表示
    // カテゴリ別内訳の表示
    // 検索時間の表示
}
```

### 5. エラーハンドリング・ログ

#### 検索エラー処理
```javascript
function handleSearchError(error, query, category) {
    // データベースエラーの適切な処理
    // 権限エラーの詳細情報
    // クエリ構文エラーの案内
    // ユーザーフレンドリーなエラーメッセージ
}
```

#### 検索ログ・メトリクス
```javascript
function logSearchActivity(userId, query, category, resultCount, duration) {
    // 検索アクティビティの記録
    // パフォーマンスメトリクス収集
    // 人気検索キーワードの追跡
    // 異常な検索パターンの検出
}
```

### 6. パフォーマンス最適化

#### 検索結果キャッシュ
```javascript
class SearchCache {
    constructor() {
        // Redis/メモリキャッシュの初期化
        // TTL設定（5分間）
        // キャッシュキーの生成戦略
    }

    async get(query, category, userId) {
        // キャッシュからの検索結果取得
        // ユーザー権限を考慮したキャッシュキー
    }

    async set(query, category, userId, results) {
        // 検索結果のキャッシュ保存
        // 適切な有効期限設定
    }
}
```

#### 検索パフォーマンス監視
```javascript
function monitorSearchPerformance(startTime, query, resultCount) {
    // 検索実行時間の測定
    // スロークエリの特定
    // リソース使用量の監視
    // アラート機能の実装
}
```

## 注意事項

- NodeBB内部APIの使用でプラグイン互換性確保
- ユーザー権限・プライバシー設定の厳密な遵守
- 大量検索リクエストに対するレート制限
- 検索結果の一貫性とリアルタイム性のバランス
- 多言語コンテンツの適切な検索対応