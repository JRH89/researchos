ALTER TABLE workspace_papers ADD COLUMN IF NOT EXISTS citation_style TEXT NOT NULL DEFAULT 'APA' CHECK (citation_style IN ('APA', 'MLA'));
ALTER TABLE workspace_papers ADD COLUMN IF NOT EXISTS target_word_count INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE workspace_papers ADD COLUMN IF NOT EXISTS paper_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('grant', 'reservation', 'settlement', 'release')),
  credits INTEGER NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS credit_ledger_account_idx ON credit_ledger (account_id, created_at DESC);
