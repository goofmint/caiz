# タスク17: Slack向け新規コメント通知

## 概要

コミュニティで新規コメント（返信投稿）が作成された時に、Slackへ通知を送信する機能を実装する。

## 機能要件

### 基本機能
- 新規コメント作成時にSlack通知を送信
- 通知設定で「新規投稿」がONの場合のみ通知
- コメント内容のプレビュー表示
- 投稿者情報の表示
- トピックへのリンク提供

### 通知条件
- コミュニティにSlackが接続されている
- 通知設定で「新規投稿」が有効
- 対象カテゴリがコミュニティのルートカテゴリ配下

## 技術仕様

### フック
- `action:post.save` - 新規コメント作成時に発火

### 通知クラス
```javascript
class SlackCommentNotifier {
    /**
     * 新規コメント通知を送信
     * @param {Object} postData - 投稿データ
     * @param {number} postData.pid - 投稿ID
     * @param {number} postData.tid - トピックID
     * @param {number} postData.uid - 投稿者ID
     * @param {string} postData.content - 投稿内容
     * @param {number} postData.timestamp - 投稿日時
     */
    async sendNewCommentNotification(postData) {
        // 1. トピック情報を取得
        // 2. カテゴリ階層を辿ってコミュニティを特定
        // 3. Slack接続状況と通知設定を確認
        // 4. Slack Block Kitメッセージを構築
        // 5. Slack API経由で通知送信
    }

    /**
     * コメント通知用のSlack Block Kitメッセージを構築
     * @param {Object} commentData - コメントデータ
     * @param {Object} topicData - トピックデータ
     * @param {Object} userData - 投稿者データ
     * @param {Object} communityData - コミュニティデータ
     * @returns {Object} Slack Block Kit形式のメッセージ
     */
    buildCommentMessage(commentData, topicData, userData, communityData) {
        // Block Kit形式のメッセージを構築
        // - ヘッダー: 新規コメント通知
        // - 投稿者情報とアバター
        // - コメント内容のプレビュー（200文字まで）
        // - トピック情報とリンク
        // - 投稿日時
    }

    /**
     * コメント内容をSlack表示用にフォーマット
     * @param {string} content - HTML形式のコメント内容
     * @returns {string} プレーンテキスト（200文字以内）
     */
    formatCommentContent(content) {
        // HTMLタグを除去
        // Markdownをプレーンテキストに変換
        // 200文字でカット（...付き）
    }
}
```

### フック実装
```javascript
// library.js内の実装
plugin.actionPostSave = async function(hookData) {
    const { post } = hookData;
    
    // 新規投稿（コメント）かチェック
    if (!post || post.isMainPost) {
        return; // トピック作成は別の通知で処理
    }
    
    // Slack通知処理を実行
    const notifier = new SlackCommentNotifier();
    await notifier.sendNewCommentNotification(post);
};
```

## メッセージ例

```
🗨️ New comment posted

👤 nakatsugawa commented on:

📝 "Question about React useEffect"

💬 "Let me explain about useEffect dependency array. When the dependency array is empty, it only executes when the component mounts..."

📍 #general-discussion | goofmint Community
🕒 August 19, 2024 at 3:30 PM

👀 View Topic
```

## 実装順序

1. `SlackCommentNotifier`クラスの基本構造作成
2. `action:post.save`フックの実装
3. コメント内容フォーマット処理の実装
4. Slack Block Kitメッセージ構築
5. 通知送信ロジックの実装
6. テスト・デバッグ

## 注意点

- トピック作成との重複を避ける（`isMainPost`チェック）
- コメント内容の適切なサニタイズ
- Slack APIレート制限への対応
- エラーハンドリングの充実