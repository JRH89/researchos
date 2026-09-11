ALTER TABLE research_workspaces ADD COLUMN IF NOT EXISTS owner_uid TEXT NOT NULL DEFAULT 'local-development-user';
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS owner_uid TEXT NOT NULL DEFAULT 'local-development-user';
ALTER TABLE workspace_papers ADD COLUMN IF NOT EXISTS owner_uid TEXT NOT NULL DEFAULT 'local-development-user';

CREATE INDEX IF NOT EXISTS research_workspaces_owner_uid_idx ON research_workspaces (owner_uid, updated_at DESC);
CREATE INDEX IF NOT EXISTS research_sessions_owner_uid_idx ON research_sessions (owner_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS workspace_papers_owner_uid_idx ON workspace_papers (owner_uid, created_at DESC);
