# Guidelines

This document defines the project's rules, objectives, and progress management methods. Please proceed with the project according to the following content.

## 🚨 CRITICAL - NEVER RUN THESE COMMANDS 🚨

**ABSOLUTELY FORBIDDEN Docker commands:**

- `docker-compose stop`
- `docker-compose restart` 
- `docker stop`
- `docker restart`
- `docker kill`
- `./nodebb build`
- `./nodebb restart`
- `./nodebb log`
- Any command that stops/restarts Docker containers

**These commands will BREAK the development environment.**

## Top-Level Rules

- To maximize efficiency, **if you need to execute multiple independent processes, invoke those tools concurrently, not sequentially**.
- **You must think exclusively in English**. However, you are required to **respond in Japanese**.
- To understand how to use a library, **always use the Contex7 MCP** to retrieve the latest information.
- For temporary notes for design, create a markdown in `.tmp` and save it.
- **After using Write or Edit tools, ALWAYS verify the actual file contents using the Read tool**, regardless of what the system-reminder says. The system-reminder may incorrectly show "(no content)" even when the file has been successfully written.
- Please respond critically and without pandering to my opinions, but please don't be forceful in your criticism.

## 🚨 CRITICAL: デグレーション防止ルール 🚨

**絶対にデグレを発生させるな！！！** 

### 厳守事項

1. **動作している機能は絶対に触るな**
   - 既に動作確認済みの部分（window.socket, acpScripts, 引数順序等）は変更禁止
   - 「より良い方法」があっても変更しない

2. **最小限の変更のみ実施**
   - タスクで要求された部分のみを修正
   - 関連しない部分は読むだけで編集しない

3. **「ついでに」は禁止**
   - 「ついでにリファクタリング」禁止
   - 「ついでに改善」禁止
   - 「ついでに最適化」禁止

4. **変更前の動作を必ず維持**
   - 修正前：window.socket → 修正後も：window.socket
   - 修正前：acpScripts → 修正後も：acpScripts
   - 引数の順序、関数シグネチャは変更しない

5. **存在しないAPIを使わない**
   - NodeBBのドキュメントにない関数は使用禁止
   - 「あるはず」ではなく「確実にある」ものだけ使用

6. **フォールバック処理は絶対禁止**
   - `settings?.prompts?.systemPrompt || 'デフォルト値'` 等のフォールバック禁止
   - 設定が取得できない場合は明確にエラーを出す
   - 「とりあえず動く」フォールバックは不具合の温床

## 🚨 CRITICAL: NodeBB i18n翻訳システムのルール 🚨

### 必須の調査・理解事項
1. **実装前に必ずWebSearchやWebFetchで調査する**
   - NodeBBの翻訳システムの仕組みを理解する
   - `translator.translate()`の正しい使い方を調べる
   - いきなりコーディングから入るな

### NodeBB翻訳システムの仕様
1. **翻訳キーの形式**
   - 正しい形式：`[[namespace:key]]`
   - 例：`[[caiz:demote-to-manager]]`

2. **言語ファイルの構造**
   - **ネストしたオブジェクトは使用禁止**
   - `translator.translate()`は`members.demote-to-manager`形式を直接アクセスできない
   - **必ずフラット構造にする**
   ```json
   // ❌ 間違い：ネスト構造
   "members": {
     "demote-to-manager": "マネージャーに降格"
   }
   
   // ✅ 正しい：フラット構造  
   "demote-to-manager": "マネージャーに降格"
   ```

3. **翻訳実装の必須手順**
   - 全言語ファイル（ja、en-US、en-GB）で同じキー構造にする
   - `grep`で全箇所を洗い出してから一括修正する
   - **絶対にハードコーディングしない**

4. **よくある失敗パターン**
   - `app.parseAndTranslate()`を単一キーに使用（テンプレート用なので間違い）
   - 勝手に`translator.translate()`の引数を推測する
   - 一部だけ修正して他の箇所を見落とす

### 教訓
- **調べてから実装する**（最重要）
- 包括的な修正が必要（一部修正は意味がない）
- NodeBBの翻訳システムを理解せずに実装するな

## Programming Rules

- Avoid hard-coding values unless absolutely necessary.
- Do not use `any` or `unknown` types in TypeScript.
- You must not use a TypeScript `class` unless it is absolutely necessary (e.g., extending the `Error` class for custom error handling that requires `instanceof` checks).

## Development Style - Specification-Driven Development

### Overview

When receiving development tasks, please follow the 4-stage workflow below. This ensures requirement clarification, structured design, and efficient implementation.

### Important Notes

- Each stage depends on the deliverables of the previous stage
- Please obtain user confirmation before proceeding to the next stage
- Always use this workflow for complex tasks or new feature development
- Simple fixes or clear bug fixes can be implemented directly
