# 1. アップロードファイルのバックアップを作成
tar cfz upload.tag.gz app/public/uploads

# 2. データベースのバックアップを作成
docker-compose exec postgres pg_dump -U nodebb nodebb > backup.sql

# 3. 現在のブランチとステータスを確認
git status
git branch

# 4. 最新の変更を取得
git fetch origin

# 5. masterブランチに最新の変更をマージ（fast-forward）
git pull origin master

# 8. データベースのアップグレード（必要に応じて）
./nodebb upgrade

# 9. NodeBBの再起動
docker-compose restart

# 10. 正常性チェック
docker-compose logs -f nodebb

既に実行済みのステップ：
- ✅ git fetch origin - 最新の変更を取得
- ✅ git pull origin master - 429コミットのfast-forward適用

次に実行すべきコマンド：
npm install
npm run build
./nodebb upgrade
docker-compose restart
