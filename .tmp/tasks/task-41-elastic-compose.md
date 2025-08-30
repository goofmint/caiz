# 41: 検索のElastic対応（docker-composeの用意）

- [ ] 検索用の Elasticsearch サービスを `docker-compose` に追加する

## 目的

NodeBB プラグイン群から利用する検索バックエンドとして Elasticsearch を別コンテナで提供する。アプリ本体およびプラグインの実装には触れず、まずは構成と責務を明確化する。

## 要件

- バージョンは LTS 互換の安定版（例: 8.x 系）を明示
- 開発用途（シングルノード、セキュリティ最小構成）
- ホストマシンへのポート公開は必要最小限（HTTP のみ）
- データはボリュームに永続化
- 禁止コマンド（停止/再起動系）は使わない運用前提

## サービス責務

- インデックスの作成・マッピング適用
- ドキュメントの登録・更新・削除
- クエリの実行（言語別トークナイズ、ハイライトを含む）
- ヘルスチェック（NodeBB 側からの疎通確認）

## インタフェース設計（アプリ側からの利用想定）

以下は「コードはインタフェースのみ。中身は説明のみ」の方針に従った、英語の型定義例です。実装は行いません。

```ts
// Core connection settings for Elasticsearch client
export interface ElasticConnection {
  node: string;              // e.g. http://elasticsearch:9200
  username?: string;         // optional for secured clusters
  password?: string;         // optional for secured clusters
  ssl?: {
    rejectUnauthorized: boolean; // dev: false when self-signed
  };
}

// Index settings used by the application layer
export interface SearchIndexConfig {
  indexName: string;         // e.g. "nodebb-posts"
  language: string;          // e.g. "ja", "en", "de"
  shards?: number;           // defaults depend on env
  replicas?: number;         // 0 for dev
}

// Domain object to be indexed
export interface SearchDocument {
  id: string;                // unique id (topic/post)
  type: 'topic' | 'post';
  cid: number;               // category id
  tid?: number;              // topic id
  pid?: number;              // post id
  title?: string;            // for topics
  content?: string;          // for posts
  tags?: string[];
  language: string;          // ISO code used for analyzers
  createdAt: string;         // ISO8601
  updatedAt: string;         // ISO8601
  visibility: 'public' | 'private';
}

// Query options for search requests
export interface SearchQueryOptions {
  q: string;                 // raw query string
  language?: string;         // analyzer selection
  offset?: number;           // pagination offset
  limit?: number;            // pagination limit
  cid?: number;              // filter by category
  types?: Array<'topic' | 'post'>; // filter types
}

// Normalized search result item
export interface SearchHit {
  id: string;
  type: 'topic' | 'post';
  score: number;
  highlight?: { title?: string; content?: string };
}

// Client interface used by NodeBB plugins
export interface SearchClient {
  ensureIndex(config: SearchIndexConfig): Promise<void>;         // create index + mappings if missing
  index(doc: SearchDocument): Promise<void>;                     // upsert document
  remove(id: string, type: 'topic' | 'post'): Promise<void>;     // delete document
  search(opts: SearchQueryOptions): Promise<{ hits: SearchHit[]; total: number }>; // run query
  ping(): Promise<boolean>;                                      // health check
}
```

## コンテナ構成（設計方針）

- サービス名: `elasticsearch`
- ポート: `9200` のみ公開（HTTP）。`9300`（transport）はローカルのみ
- 環境変数: 開発用の最小セット（`discovery.type=single-node` など）
- ボリューム: `esdata:/usr/share/elasticsearch/data`

上記は compose での宣言を前提にしているが、本タスクでは compose の「具体的な YAML」は記述しない（設計のみ）。

## 注意事項

- このリポジトリでは、Docker 停止/再起動系コマンドは「厳禁」
- 検索機能の多言語対応は別チェックボックスで扱う（本タスクはコンテナ構成のみ）

