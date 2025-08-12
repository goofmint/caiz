# Task 05g: トピックの作成、編集時のAI分析機能の実装

## 概要

トピックの作成および編集時にAI分析を実行し、不適切なコンテンツを検出・対処する機能を実装する。

## 対象

- [ ] トピック作成・編集時のAI分析とモデレーション処理

## 詳細仕様

### 1. トピック作成時のAI分析

#### フック処理の流れ

```javascript
// filter:topic.create フック（保存前）
async moderateTopicCreate(hookData) {
    // タイトルとコンテンツの結合
    const fullContent = `${hookData.data.title}\n${hookData.data.content}`;
    
    // AI分析実行
    const analysisResult = await analyzer.analyzeContent({
        content: fullContent,
        contentType: 'topic',
        uid: hookData.data.uid
    });
    
    // リジェクト判定
    if (analysisResult.action === 'rejected') {
        throw new Error('[[ai-moderation:topic-rejected]]');
    }
    
    // フラグ判定はキャッシュに保存（保存後に処理）
    if (analysisResult.action === 'flagged') {
        const tempKey = `topic_${hookData.data.uid}_${Date.now()}`;
        analysisCache.set(tempKey, analysisResult);
        hookData.topic._aiModerationKey = tempKey;
    }
}
```

#### 保存後のフラグ作成

```javascript
// action:topic.save フック（保存後）
async afterTopicSave(data) {
    const { topic } = data;
    
    if (!topic._aiModerationKey) return;
    
    const cachedResult = analysisCache.get(topic._aiModerationKey);
    if (!cachedResult) return;
    
    // フラグ作成
    const config = await settings.getSettings();
    await flags.create(
        'post',
        topic.mainPid,  // トピックのメイン投稿ID
        config.flagUid || 1,
        `AI Moderation: Topic flagged with score: ${cachedResult.score}`
    );
}
```

### 2. トピック編集時のAI分析

#### フック処理

```javascript
// filter:topic.edit フック
async moderateTopicEdit(hookData) {
    // タイトルのみの変更をチェック
    const content = hookData.data.title;
    
    // AI分析実行
    const analysisResult = await analyzer.analyzeContent({
        content: content,
        contentType: 'topic-title',
        tid: hookData.data.tid,
        uid: hookData.data.uid
    });
    
    // リジェクト判定
    if (analysisResult.action === 'rejected') {
        throw new Error('[[ai-moderation:topic-title-rejected]]');
    }
    
    // フラグ判定（編集時は即座にフラグ作成）
    if (analysisResult.action === 'flagged') {
        // tid から mainPid を取得してフラグ作成
        const mainPid = await topics.getTopicField(hookData.data.tid, 'mainPid');
        if (mainPid) {
            await createFlagForPost(mainPid, analysisResult.score);
        }
    }
}
```

### 3. キャッシュ管理

#### キャッシュの構造

```javascript
// トピック用キャッシュ
const topicAnalysisCache = new Map();

// キャッシュエントリ
{
    score: 75,
    action: 'flagged',
    categories: ['spam', 'violence'],
    timestamp: Date.now()
}
```

#### クリーンアップ処理

```javascript
// 5分以上古いキャッシュを削除
function cleanupCache() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [key, value] of topicAnalysisCache.entries()) {
        if (value.timestamp < fiveMinutesAgo) {
            topicAnalysisCache.delete(key);
        }
    }
}
```

### 4. エラーハンドリング

#### AI分析失敗時の処理

- エラー時は承認（フェイルセーフ）
- エラーログを記録
- ユーザーへの影響を最小限に

```javascript
try {
    const result = await analyzer.analyzeContent(contentData);
    // 処理
} catch (error) {
    winston.error('[ai-moderation] Topic analysis failed', {
        error: error.message,
        tid: hookData.topic?.tid
    });
    // 承認して続行
    return hookData;
}
```

## plugin.json への追加

```json
{
    "hooks": [
        {
            "hook": "filter:topic.create",
            "method": "moderateTopicCreate"
        },
        {
            "hook": "filter:topic.edit",
            "method": "moderateTopicEdit"
        },
        {
            "hook": "action:topic.save",
            "method": "afterTopicSave"
        }
    ]
}
```

## 成功条件

- トピック作成時にタイトルと本文が結合されてAI分析される
- 拒否判定の場合、トピック作成がブロックされる
- フラグ判定の場合、保存後にメイン投稿にフラグが作成される
- トピック編集時にタイトルがAI分析される
- エラー発生時もシステムが正常に動作を継続する