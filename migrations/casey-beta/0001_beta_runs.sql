CREATE TABLE IF NOT EXISTS beta_runs (
 id TEXT PRIMARY KEY,
 user_email TEXT NOT NULL,
 user_sub TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 expires_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now','+30 days')),
 channel TEXT NOT NULL CHECK(channel IN ('call','intro','followup')),
 goal TEXT NOT NULL,
 seller_input TEXT NOT NULL,
 buyer_input TEXT NOT NULL,
 result_json TEXT,
 status TEXT NOT NULL CHECK(status IN ('processing','ready','failed')),
 error_code TEXT,
 duration_ms INTEGER,
 feedback TEXT CHECK(feedback IN ('useful','needs-work') OR feedback IS NULL),
 feedback_comment TEXT
);
CREATE INDEX IF NOT EXISTS idx_beta_user_time ON beta_runs(user_email,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_expiry ON beta_runs(expires_at);
