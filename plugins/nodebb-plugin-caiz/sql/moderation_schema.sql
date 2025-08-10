-- AI Moderation Database Schema
-- Adds moderation queue and settings tables for the community plugin

-- Table for moderation queue entries
CREATE TABLE IF NOT EXISTS moderation_queue (
    id SERIAL PRIMARY KEY,
    pid INTEGER NOT NULL,                    -- 投稿ID
    cid INTEGER NOT NULL,                    -- カテゴリID
    uid INTEGER NOT NULL,                    -- ユーザーID
    content TEXT NOT NULL,                   -- 投稿内容
    ai_score INTEGER NOT NULL,               -- AIスコア (0-100)
    risk_categories JSONB,                   -- 検出されたリスクカテゴリ
    threshold_used INTEGER NOT NULL,         -- 使用されたしきい値
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER NULL,                -- レビュー担当者のUID
    reviewed_at TIMESTAMPTZ NULL,            -- レビュー日時
    reason TEXT NULL,                        -- 承認/拒否理由
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_cid_status ON moderation_queue(cid, status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created_at ON moderation_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_pid ON moderation_queue(pid);

-- Table for community moderation settings
CREATE TABLE IF NOT EXISTS community_moderation_settings (
    cid INTEGER PRIMARY KEY,                 -- カテゴリID
    enabled BOOLEAN DEFAULT TRUE,            -- モデレーション有効/無効
    threshold_moderate INTEGER DEFAULT 70,   -- モデレーション閾値
    threshold_reject INTEGER DEFAULT 90,     -- 自動拒否閾値
    auto_approve_trusted BOOLEAN DEFAULT FALSE, -- 信頼ユーザー自動承認
    notify_managers BOOLEAN DEFAULT TRUE,    -- マネージャーへの通知
    settings JSONB DEFAULT '{}',             -- 追加設定（後方互換性）
    harassment_enabled BOOLEAN DEFAULT TRUE,
    hate_enabled BOOLEAN DEFAULT TRUE,
    violence_enabled BOOLEAN DEFAULT TRUE,
    sexual_enabled BOOLEAN DEFAULT TRUE,
    spam_enabled BOOLEAN DEFAULT TRUE,
    misinformation_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_moderation_queue_updated_at BEFORE UPDATE ON moderation_queue FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_community_moderation_settings_updated_at BEFORE UPDATE ON community_moderation_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default settings for existing communities
INSERT INTO community_moderation_settings (cid) 
SELECT cid FROM categories 
WHERE parentCid = 0 
AND NOT EXISTS (SELECT 1 FROM community_moderation_settings WHERE community_moderation_settings.cid = categories.cid);