# Changelog

## [Unreleased]

### Fixed
- `/communities`エンドポイントの404エラーを修正
  - `routes/index.js`の`_mounts.communities`で`name`パラメータを使用するように修正
  - `remountable`配列に`communities`を追加
  - コントローラーを`controllers.categories.list`から`controllers.communities.list`に変更 