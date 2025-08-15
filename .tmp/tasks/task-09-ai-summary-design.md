# タスク09: AIサマリー機能の設計

## 概要

NodeBBコミュニティのトピック（スレッド）における投稿の流れをAIで自動要約し、新しい参加者や後から参加するユーザーが議論の流れを素早く把握できる機能を設計します。

## 機能仕様

### コア機能
- ✅ トピック内の投稿を一定間隔（10投稿ごと）で自動的にAI要約
- ✅ トピック表示時に要約を見やすく表示
- ✅ 要約の生成タイミングと表示制御

## 詳細設計

### 1. 要約生成システム

#### トリガー条件
- トピック内の投稿数が10の倍数に達した時点で自動実行
- 手動要約実行機能（コミュニティ管理者のみ）

#### 要約対象
- トピック作成から最新投稿まで全ての投稿を対象
- 削除された投稿は除外
- モデレーション待ちの投稿は除外

#### AI要約処理フロー
```javascript
// Interface only - implementation TBD
class TopicSummaryGenerator {
  /**
   * Generate summary for a topic
   * @param {number} topicId - Target topic ID
   * @param {number} maxPosts - Maximum number of posts to summarize (default: 10)
   * @returns {Promise<SummaryResult>} Generated summary
   */
  async generateSummary(topicId, maxPosts = 10) {
    // Implementation will use AI API to analyze post content
    // and generate coherent summary in Japanese
  }

  /**
   * Check if topic needs summary update
   * @param {number} topicId - Target topic ID
   * @returns {Promise<boolean>} Whether summary should be generated
   */
  async shouldGenerateSummary(topicId) {
    // Check post count and last summary generation time
  }
}
```

### 2. データベース設計

#### topic_summaries テーブル
```sql
CREATE TABLE topic_summaries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  topic_id INT NOT NULL,
  summary_text TEXT NOT NULL,
  post_count INT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ai_model VARCHAR(100),
  INDEX idx_topic_id (topic_id)
);
```

### 3. UI/UX設計

#### 表示位置
- トピック表示ページの上部（最初の投稿の前）
- 折りたたみ可能なカードUI形式

#### 表示条件
- 投稿数が10以上のトピックのみ表示
- 要約が生成されているトピックのみ表示

#### UI要素
```javascript
// Interface only - implementation TBD
class SummaryUIComponent {
  /**
   * Render summary card in topic view
   * @param {Object} summaryData - Summary information
   * @param {HTMLElement} container - Target container element  
   */
  renderSummaryCard(summaryData, container) {
    // Render collapsible card with summary text
    // Include generation timestamp and post count
    // Add expand/collapse functionality
  }

  /**
   * Toggle summary visibility
   * @param {string} summaryId - Summary identifier
   */
  toggleSummary(summaryId) {
    // Handle expand/collapse user interaction
    // Save user preference for summary visibility
  }
}
```

### 4. API設計

#### WebSocket Events
```javascript
// Client → Server
socket.emit('plugins.caiz.generateTopicSummary', {
  topicId: number,
  forceRegenerate: boolean
});

// Server → Client  
socket.emit('plugins.caiz.topicSummaryGenerated', {
  topicId: number,
  summary: string,
  postCount: number,
  generatedAt: timestamp
});

socket.emit('plugins.caiz.topicSummaryError', {
  topicId: number,
  error: string
});
```

#### REST API Endpoints
```javascript
// Interface only - implementation TBD
class SummaryAPIController {
  /**
   * Get topic summary
   * GET /api/v3/topics/:topicId/summary
   */
  async getTopicSummary(req, res) {
    // Return existing summary or generate new one
  }

  /**
   * Manually trigger summary generation (admin only)
   * POST /api/v3/topics/:topicId/summary
   */
  async generateTopicSummary(req, res) {
    // Force regenerate summary for topic
  }

  /**
   * Delete topic summary (admin only)  
   * DELETE /api/v3/topics/:topicId/summary
   */
  async deleteTopicSummary(req, res) {
    // Remove existing summary
  }
}
```

### 5. 権限・セキュリティ

#### アクセス制御
- 要約表示: トピック閲覧権限に準拠
- 手動要約生成: コミュニティ管理者のみ
- 要約削除: システム管理者のみ

#### データ保護
- 要約テキストにはユーザーの個人情報を含めない
- AI処理時に投稿者名やメタデータを除外

### 6. パフォーマンス考慮

#### 非同期処理
- 要約生成は背景ジョブとして実行
- フロントエンドをブロックしない設計

#### キャッシュ戦略
- 生成済み要約はデータベースに永続化
- 要約表示時のリアルタイム生成は避ける

#### リソース最適化
- 同時要約生成数の制限（キューイング）
- AI API呼び出し回数の制御

## 技術的制約

### AI API連携
- OpenAI GPT-4 または Claude API使用予定
- API呼び出し制限とコスト管理
- レート制限への対応

### NodeBB統合
- 既存のプラグインシステムとの互換性維持
- NodeBBのテンプレートエンジンとの統合
- 多言語対応（日本語要約生成）

## 今後の拡張可能性

- 要約品質の学習・改善機能
- ユーザーによる要約評価システム
- 要約スタイルのカスタマイズ
- 他言語での要約生成対応