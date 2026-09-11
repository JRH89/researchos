ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE research_sessions SET expires_at = NOW() + INTERVAL '7 days' WHERE workspace_id IS NULL AND expires_at IS NULL;
CREATE INDEX IF NOT EXISTS research_sessions_expiry_idx ON research_sessions (expires_at) WHERE expires_at IS NOT NULL;
