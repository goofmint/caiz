# タスク05: AI投稿モデレーション設計書

## 概要

投稿時にAIを使用してコンテンツをモデレーションし、不適切な投稿に対して自動的にフラグを立てるシステムを実装する。しきい値を超える内容が検出された場合、投稿は「要モデレーション」状態となり、コミュニティの管理者による承認待ちとなる。

## 機能要件

### 基本機能
1. **投稿前AI分析**
   - 投稿内容（タイトル、本文）をAI APIで分析
   - 有害度スコアの算出（0-100の範囲）
   - カテゴリ別リスクレベルの判定

2. **しきい値による自動判定**
   - コミュニティ毎に設定可能なしきい値（デフォルトあり）
   - しきい値を超える投稿の自動フラグ付け
   - 投稿状態の管理（公開/要モデレーション/拒否）

3. **投稿状態管理**
   - 通常投稿: 即座に公開
   - 要モデレーション: 管理者承認待ち（非公開）
   - 自動拒否: 極めて高いスコアの投稿は自動拒否

### 検出対象カテゴリ
- **ハラスメント/いじめ**: 個人攻撃、誹謗中傷
- **ヘイトスピーチ**: 差別的発言、憎悪表現
- **暴力的内容**: 暴力の助長、脅迫
- **不適切な性的内容**: 成人向けコンテンツ
- **スパム/宣伝**: 過度な宣伝、スパム行為
- **誤情報/デマ**: 明らかに虚偽の情報
- **過度に攻撃的**: 攻撃的な言葉遣い、挑発的な表現

## 技術設計

### アーキテクチャ

```
投稿作成
    ↓
AI分析サービス
    ↓
スコア判定 → データベース保存
    ↓
状態設定（公開/要モデレーション/拒否）
    ↓
通知システム（管理者へ）
```

### データベース設計

NodeBBの既存データベース（PostgreSQL）に以下のテーブルを追加

#### テーブル: moderation_queue
```sql
CREATE TABLE moderation_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pid INT NOT NULL,                    -- 投稿ID
    cid INT NOT NULL,                    -- カテゴリID
    uid INT NOT NULL,                    -- ユーザーID
    content TEXT NOT NULL,               -- 投稿内容
    ai_score INT NOT NULL,               -- AIスコア (0-100)
    risk_categories JSON,                -- 検出されたリスクカテゴリ
    threshold_used INT NOT NULL,         -- 使用されたしきい値
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT NULL,                -- レビュー担当者のUID
    reviewed_at TIMESTAMP NULL,          -- レビュー日時
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_cid_status (cid, status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (pid) REFERENCES posts(pid) ON DELETE CASCADE,
    FOREIGN KEY (cid) REFERENCES categories(cid) ON DELETE CASCADE,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);
```

#### テーブル: community_moderation_settings
```sql
CREATE TABLE community_moderation_settings (
    cid INT PRIMARY KEY,                 -- カテゴリID
    enabled TINYINT DEFAULT 1,           -- モデレーション有効/無効
    threshold_moderate INT DEFAULT 70,   -- モデレーション閾値
    threshold_reject INT DEFAULT 90,     -- 自動拒否閾值
    auto_approve_trusted TINYINT DEFAULT 0, -- 信頼ユーザー自動承認
    notify_managers TINYINT DEFAULT 1,   -- マネージャーへの通知
    settings JSON, -- keep for forward-compat, but add structured fields below:
    harassment_enabled    TINYINT DEFAULT 1,
    hate_enabled          TINYINT DEFAULT 1,
    violence_enabled      TINYINT DEFAULT 1,
    sexual_enabled        TINYINT DEFAULT 1,
    spam_enabled          TINYINT DEFAULT 1,
    misinformation_enabled TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cid) REFERENCES categories(cid) ON DELETE CASCADE
);
```

### AIサービス統合

#### 使用想定API

- **OpenAI Moderation API**: 基本的な有害コンテンツ検出

#### プロバイダー非依存のマッピング層

異なるAIプロバイダーからの多様なラベルとスコアを内部分類法に正規化し、監査用に生のペイロードを保持する設計：

```javascript
// プロバイダー固有カテゴリから内部カテゴリへのマッピング
const CATEGORY_MAPPING = {
  openai: {
    'harassment': { internal: 'harassment', weight: 1.0 },
    'hate': { internal: 'hate', weight: 1.0 },
    'violence': { internal: 'violence', weight: 1.0 },
    'sexual': { internal: 'sexual', weight: 1.0 }
  }
};

// 戻り値の構造
interface ModerationResult {
  provider: string;           // プロバイダー名
  model: string;             // 使用モデル
  latency: number;           // レスポンス時間
  requestId: string;         // リクエストID
  rawResponsePointer: string; // 生レスポンスの参照ID（大きなペイロードを直接埋め込まない）
  normalizedScore: number;   // 正規化されたスコア (0-100)
  categories: {
    harassment: number,
    hate: number,
    violence: number,
    sexual: number,
    spam: number,
    misinformation: number
  }
}
```

#### API統合クラス設計
```javascript
class ModerationService {
  constructor() {
    this.circuitBreaker = new CircuitBreaker();
  }

  async analyzeContent(content, language = 'ja', options = {}) {
    const requestId = options.idempotencyKey || `mod_${Date.now()}_${Math.random()}`;
    
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.callProvider(content, requestId);
      });
      
      return this.normalizeResponse(result, requestId);
    } catch (error) {
      // フォールバック戦略
      return this.getFallbackResult(content, requestId, error);
    }
  }

  async getHarmfulnessScore(content) {
    const result = await this.analyzeContent(content);
    return result.normalizedScore;
  }
  
  async detectRiskCategories(content) {
    const result = await this.analyzeContent(content);
    return Object.entries(result.categories)
      .filter(([_, score]) => score > 50)
      .map(([category]) => category);
  }

  normalizeResponse(providerResponse, requestId) {
    // プロバイダー固有レスポンスを内部形式に変換
    // タイムアウト・リトライ・サーキットブレーカーパターンを実装
  }
}
```

### 通知機能

既存のNodeBB通知システムを利用し、モデレーション待ちの投稿が発生した際に管理者へ通知を送信する。

### プラグインフック統合

#### NodeBB既存フックの活用

// plugin.json
```json
{
  "hooks": [
    { "hook": "filter:topic.create", "method": "moderateNewTopic",   "priority": 10 },
    { "hook": "filter:posts.create", "method": "moderateNewPost",     "priority": 10 },
    { "hook": "filter:posts.edit",   "method": "moderateEditedPost", "priority": 10 }
  ]
}
```

// library.js
```javascript
exports.moderateNewTopic = async (data) => {
  // 投稿作成前のAIモデレーションロジック
  if (data.content) {
    const moderationResult = await moderationService.analyzeContent(data.content);
    data._moderationResult = moderationResult;
    
    if (moderationResult.normalizedScore > getThreshold(data.cid)) {
      data._requiresModeration = true;
    }
  }
  return data;
};

exports.moderateNewPost = async (data) => {
  // 投稿作成後のAIモデレーションロジック
  if (data.content) {
    const moderationResult = await moderationService.analyzeContent(data.content);
    data._moderationResult = moderationResult;
    
    if (moderationResult.normalizedScore > getThreshold(data.cid)) {
      data._requiresModeration = true;
    }
  }
  return data;
};

exports.moderateEditedPost = async (data) => {
  // 投稿編集時のAIモデレーションロジック
  if (data.content) {
    const moderationResult = await moderationService.analyzeContent(data.content);
    data._moderationResult = moderationResult;
    
    if (moderationResult.normalizedScore > getThreshold(data.cid)) {
      data._requiresModeration = true;
    }
  }
  return data;
};
```

### WebSocket API設計

#### 管理者向けAPI
```javascript
// モデレーション待ち一覧取得
'plugins.moderation.getPendingPosts': { cid: number, page?: number, limit?: number }

// 投稿の承認/拒否
'plugins.moderation.reviewPost': { 
  pid: number, 
  action: 'approve' | 'reject',
  reason?: string 
}

// モデレーション設定の取得/更新
'plugins.moderation.getSettings': { cid: number }
'plugins.moderation.updateSettings': { 
  cid: number, 
  threshold_moderate: number,
  threshold_reject: number,
  enabled: boolean
}
```

## フロントエンド設計

### 管理者ダッシュボード
1. **モデレーション待ち一覧**
   - 投稿内容、AIスコア、リスクカテゴリの表示
   - 一括承認/拒否機能
   - フィルタリング（スコア範囲、日付、カテゴリ別）

2. **設定画面**
   - しきい値の調整スライダー
   - カテゴリ別検出のON/OFF
   - 通知設定

3. **統計画面**
   - モデレーション件数の推移
   - カテゴリ別検出率
   - AIスコアの分布

### ユーザー側UI
1. **投稿時の警告**
   - リアルタイムでの内容チェック（オプション）
   - 問題のある表現への警告表示

2. **投稿状態の表示**
   - 「承認待ち」状態の明示
   - 拒否された場合の理由表示

## パフォーマンス考慮事項

### 処理速度最適化
- **非同期処理**: AI分析は投稿保存後にバックグラウンドで実行
- **キャッシュ活用**: 同じ内容の再分析を避ける
- **バッチ処理**: 複数投稿の一括分析

### コスト管理
- **API呼び出し制限**: 1日あたりの分析回数上限
- **段階的検証**: 基本チェック → 詳細AI分析の2段階方式
- **信頼ユーザー除外**: 長期間問題のないユーザーはスキップ

## セキュリティ・プライバシー

### データ保護
- **個人情報の最小化**: 必要最小限のデータのみ外部APIに送信
- **データ暗号化**: 機密データの暗号化保存
- **ログ管理**: AIサービス利用ログの適切な管理

### 誤検出対策
- **人間による最終確認**: AI判定の人間による検証
- **異議申し立て機能**: ユーザーからの異議申し立て対応
- **学習データ改善**: 誤検出事例の蓄積と改善

## 実装フェーズ

### Phase 1: 基本実装
- [ ] データベーススキーマの作成
- [ ] 基本的なAI統合（OpenAI Moderation API）
- [ ] 投稿フック統合
- [ ] 基本的な管理画面
- [ ] カスタムしきい値設定
