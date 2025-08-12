# Task 05d: フィルターの設定

## 概要

フィルター設定機能をコードで実装し、ログでフィルター動作を確認する。管理画面での設定機能は不要。

## 対象

- [ ] フィルター設定の実装とログ確認

## 詳細仕様

### フィルター設定

コード内で以下のフィルター設定を実装：
- トピック作成時のフィルター
- ポスト作成時のフィルター  
- ポスト編集時のフィルター

#### 実装内容

各フックハンドラーでフィルター処理を追加し、ログで動作確認：

```javascript
// libs/hooks/topics.js
async moderateTopicCreate(hookData) {
  winston.info('[ai-moderation] Topic create hook triggered', {
    content: hookData.topic?.content?.substring(0, 50) || 'no content'
  });
  
  // フィルター処理のログ
  winston.info('[ai-moderation] Applying topic create filter');
  
  return hookData;
}
```

```javascript
// libs/hooks/posts.js  
async moderatePostCreate(hookData) {
  winston.info('[ai-moderation] Post create hook triggered', {
    content: hookData.post?.content?.substring(0, 50) || 'no content'
  });
  
  // フィルター処理のログ
  winston.info('[ai-moderation] Applying post create filter');
  
  return hookData;
}

async moderatePostEdit(hookData) {
  winston.info('[ai-moderation] Post edit hook triggered', {
    content: hookData.post?.content?.substring(0, 50) || 'no content'
  });
  
  // フィルター処理のログ
  winston.info('[ai-moderation] Applying post edit filter');
  
  return hookData;
}
```

## 成功条件

- トピック作成時にフィルターのログが出力される
- ポスト作成時にフィルターのログが出力される
- ポスト編集時にフィルターのログが出力される