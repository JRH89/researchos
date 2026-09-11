CREATE TABLE IF NOT EXISTS research_workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES research_workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS research_sessions_workspace_id_idx ON research_sessions (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_documents (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES research_workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  media_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_papers (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES research_workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  citations JSONB NOT NULL,
  source_session_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
