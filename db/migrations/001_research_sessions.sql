CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY,
  question TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('complete', 'needs-approval', 'partial', 'failed')),
  session JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_sessions_created_at_idx ON research_sessions (created_at DESC);
