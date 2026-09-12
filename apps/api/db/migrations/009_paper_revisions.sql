ALTER TABLE workspace_papers
  ADD COLUMN IF NOT EXISTS parent_paper_id UUID REFERENCES workspace_papers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_number INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS workspace_papers_revision_idx
  ON workspace_papers (owner_uid, parent_paper_id, revision_number DESC);
