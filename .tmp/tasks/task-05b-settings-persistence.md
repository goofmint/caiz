# タスク 05b: AIモデレーション設定の永続化

## 概要
AIモデレーションプラグインの管理画面で設定した値を適切に保存し、画面読み込み時に復元できるようにする。

## 要件

### 設定の保存機能
- 管理画面の「設定を保存」ボタン押下時に、フォーム内容をNodeBBのデータベースに保存
- 保存対象の設定値：
  - `apiKey`: OpenAI APIキー（暗号化して保存）
  - `thresholds.flag`: フラグ閾値（デフォルト: 70）
  - `thresholds.reject`: 拒否閾値（デフォルト: 90）

検証・比較ルール:
- 値の範囲: 0〜100 の整数
- 比較規則:
  - flag は「スコア >= flag」でフラグ
  - reject は「スコア >= reject」で拒否
- 整合性: flag <= reject を必須（それ以外は保存不可）
- 入力時は数値以外/範囲外/NaN を拒否し、エラーメッセージを表示

### 設定の復元機能
- 管理画面読み込み時に、保存済み設定をフォームに復元
APIキーの更新・消去ルール:
- 保存済みの場合、入力欄は「********（保存済み）」等のプレースホルダーを表示し、値はクライアントに配信しない
- そのまま保存した場合、既存のAPIキーは維持（上書きなし）
- 新しい値を入力した場合のみ更新として扱う
- 「キーを消去」ボタンを用意し、明示操作でのみ消去できる（確認ダイアログあり）
- 設定が未保存の場合はデフォルト値を表示

### データ構造
設定は以下の構造でNodeBBデータベースに保存：

```javascript
// 保存キーの例: settings:plugin:caiz:ai-moderation
{
  version: 1,
  provider: 'openai',           // 将来的に 'azure' や 'openrouter' などを拡張可能
  apiKey: '[encrypted]',        // 後述の方式で暗号化
  thresholds: {
    flag: 70,
    reject: 90
  },
  updatedAt: 1700000000000,     // epoch ms
  updatedBy: 1                  // 管理者ユーザーID
}
```

## 技術実装

### バックエンド修正
- `libs/core/settings.js` に `saveSettings()` / `getSettings()` を実装
- プラグイン設定は NodeBB の Meta.settings API を優先的に利用
  - `Meta.settings.set('caiz-ai-moderation', data)` / `Meta.settings.get('caiz-ai-moderation', callback)`
  - 利用不可の場合は `db.setObject('settings:plugin:caiz:ai-moderation', data)` / `db.getObject('settings:plugin:caiz:ai-moderation', callback)`
- APIキーの暗号化は Node.js の crypto モジュールで AES-256-GCM を使用
  - 鍵は環境変数 `CAIZ_ENC_KEY`（32バイト）から取得
  - IV は毎回ランダム生成、`iv`, `tag`, `cipherText` を Base64 で保持
  - 復号はサーバー側のみで実行し、クライアントには平文を返さない

### フロントエンド修正
- `static/lib/admin.js`でNodeBBのSettings APIを使用

実装のポイント（例）:
```javascript
// admin.js
const formId = 'caiz-ai-settings';
const pluginId = 'nodebb-plugin-caiz'; // 実IDに合わせる
const settings = new Settings(pluginId, formId, () => {
  settings.load(() => {
    if (saved.hasApiKey) {
      const input = document.querySelector('#apiKey');
      input.value = ''; // 平文はセットしない
      input.placeholder = '********（保存済み）';
      input.dataset.placeholder = '1';
    }
  });
});

document.querySelector('#save').addEventListener('click', async () => {
  const payload = settings.serialize();
  // プレースホルダーのままなら apiKey を送らない（上書き防止）
  const input = document.querySelector('#apiKey');
  if (input.dataset.placeholder === '1' && !input.value) {
    delete payload.apiKey;
  }
  if (document.querySelector('#clearApiKey')?.checked) {
    payload.apiKey = ''; // 明示クリア
  }
  await socket.emit('admin.caiz.saveSettings', payload);
});
```

### セキュリティ考慮
- APIキーは暗号化して保存
- 管理画面でのAPIキー表示は避ける（保存状態のみ表示）
- 設定保存時の権限チェック（管理者のみ）

## 完了条件
- [ ] 管理画面で設定値を入力して保存できる
- [ ] 画面再読み込み時に保存済み設定が復元される
- [ ] APIキーが安全に暗号化されて保存される
- [ ] デフォルト値が適切に設定される
- [ ] エラーハンドリングが適切に動作する