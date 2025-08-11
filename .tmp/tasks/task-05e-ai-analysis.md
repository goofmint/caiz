# Task 05e: AI分析処理の実装

## 概要

Task 05dで確立したフィルター設定に実際のAI分析処理を組み込む。各フックハンドラーでコンテンツを抽出し、AI分析を実行して結果に応じてコンテンツを制御する。

## 対象

- [ ] AI分析処理の実装とコンテンツ制御

## 詳細仕様

### AI分析の実装

Task 05dで確認した正しいデータ構造を基に、各フックで実際のAI分析を実行する。

#### データ抽出パターン（確認済み）

```javascript
// Topic create hook
const title = hookData.topic?.title || hookData.data?.title;
const content = hookData.data?.content;
const tid = hookData.topic?.tid;
const uid = hookData.topic?.uid;

// Post create hook  
const content = hookData.post?.content;
const pid = hookData.post?.pid;
const uid = hookData.post?.uid;
const isMainTopic = hookData.data?.isMain;

// Post edit hook
const content = hookData.post?.content;
const pid = hookData.post?.pid;
const uid = hookData.post?.uid;

// Topic edit hook
const title = hookData.topic?.title || hookData.title;
const tid = hookData.topic?.tid || hookData.tid;
```

#### 実装内容

各フックハンドラーで以下を実装：

```javascript
// トピック作成時
async moderateTopicCreate(hookData) {
    const title = hookData.topic?.title || hookData.data?.title;
    const content = hookData.data?.content;
    
    winston.info('[ai-moderation] Topic create hook triggered', {
        title: title?.substring(0, 50),
        content: content?.substring(0, 50),
        tid: hookData.topic?.tid,
        uid: hookData.topic?.uid
    });
    
    if (!title && !content) {
        winston.info('[ai-moderation] No content to analyze');
        return hookData;
    }
    
    try {
        const combinedContent = `${title}\n\n${content || ''}`;
        const analysisResult = await contentAnalyzer.analyzeContent({
            content: combinedContent,
            contentType: 'topic',
            contentId: hookData.topic?.tid || 'new',
            uid: hookData.topic?.uid
        });
        
        winston.info('[ai-moderation] Topic analysis result', { 
            action: analysisResult.action,
            score: analysisResult.score 
        });
        
        // リジェクトの場合、トピック削除フラグを設定
        if (analysisResult.action === 'rejected') {
            hookData.topic.deleted = 1;
            winston.warn('[ai-moderation] Topic rejected and marked as deleted');
        }
        
    } catch (error) {
        winston.error('[ai-moderation] Topic analysis failed', { error: error.message });
    }
    
    return hookData;
}
```

```javascript  
// 投稿作成時
async moderatePostCreate(hookData) {
    const isMainTopic = hookData.data?.isMain || false;
    const content = hookData.post?.content;
    
    winston.info('[ai-moderation] Post create hook triggered', {
        content: content?.substring(0, 50),
        pid: hookData.post?.pid,
        uid: hookData.post?.uid,
        isMainTopic: isMainTopic
    });
    
    // トピック作成時の最初の投稿はスキップ
    if (isMainTopic) {
        winston.info('[ai-moderation] Skipping post filter (already processed in topic create)');
        return hookData;
    }
    
    if (!content) {
        winston.info('[ai-moderation] No content to analyze');
        return hookData;
    }
    
    try {
        const analysisResult = await contentAnalyzer.analyzeContent({
            content: content,
            contentType: 'post',
            contentId: hookData.post?.pid || 'new',
            uid: hookData.post?.uid
        });
        
        winston.info('[ai-moderation] Post analysis result', { 
            action: analysisResult.action,
            score: analysisResult.score 
        });
        
        // リジェクトの場合、投稿削除フラグを設定
        if (analysisResult.action === 'rejected') {
            hookData.post.deleted = 1;
            winston.warn('[ai-moderation] Post rejected and marked as deleted');
        }
        
    } catch (error) {
        winston.error('[ai-moderation] Post analysis failed', { error: error.message });
    }
    
    return hookData;
}
```

```javascript
// 投稿編集時
async moderatePostEdit(hookData) {
    const content = hookData.post?.content;
    
    winston.info('[ai-moderation] Post edit hook triggered', {
        content: content?.substring(0, 50),
        pid: hookData.post?.pid,
        uid: hookData.post?.uid
    });
    
    if (!content) {
        winston.info('[ai-moderation] No content to analyze');
        return hookData;
    }
    
    try {
        const analysisResult = await contentAnalyzer.analyzeContent({
            content: content,
            contentType: 'post',
            contentId: hookData.post?.pid,
            uid: hookData.post?.uid
        });
        
        winston.info('[ai-moderation] Post edit analysis result', { 
            action: analysisResult.action,
            score: analysisResult.score 
        });
        
        // リジェクトの場合、編集内容を無効化
        if (analysisResult.action === 'rejected') {
            delete hookData.post.content;
            winston.warn('[ai-moderation] Post edit rejected, content removed');
        }
        
    } catch (error) {
        winston.error('[ai-moderation] Post edit analysis failed', { error: error.message });
    }
    
    return hookData;
}
```

```javascript
// トピック編集時
async moderateTopicEdit(hookData) {
    const title = hookData.topic?.title || hookData.title;
    
    winston.info('[ai-moderation] Topic edit hook triggered', {
        title: title?.substring(0, 50),
        tid: hookData.topic?.tid || hookData.tid
    });
    
    if (!title) {
        winston.info('[ai-moderation] No title to analyze');
        return hookData;
    }
    
    try {
        const analysisResult = await contentAnalyzer.analyzeContent({
            content: title,
            contentType: 'topic',
            contentId: hookData.topic?.tid || hookData.tid,
            uid: hookData.topic?.uid || hookData.uid
        });
        
        winston.info('[ai-moderation] Topic edit analysis result', { 
            action: analysisResult.action,
            score: analysisResult.score 
        });
        
        // リジェクトの場合、タイトル編集を無効化
        if (analysisResult.action === 'rejected') {
            delete hookData.topic.title;
            delete hookData.title;
            winston.warn('[ai-moderation] Topic title edit rejected');
        }
        
    } catch (error) {
        winston.error('[ai-moderation] Topic edit analysis failed', { error: error.message });
    }
    
    return hookData;
}
```

#### エラーハンドリング

- AI分析エラー時は処理を続行（コンテンツを拒否しない）
- 適切なログ出力でデバッグ可能性を確保
- 設定が不正な場合のフォールバック処理

#### ログ出力仕様

- 分析開始：コンテンツの一部とメタデータ
- 分析結果：action、score
- エラー：詳細なエラーメッセージ
- 制御動作：削除フラグ設定や編集無効化の実行結果

## 成功条件

- 各フックで適切にコンテンツが抽出される
- AI分析が正しく実行される
- 分析結果に応じてコンテンツ制御が動作する
- エラー時も適切に処理が継続される
- ログで全ての動作が確認できる