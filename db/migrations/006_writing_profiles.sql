CREATE TABLE IF NOT EXISTS writing_profiles (
  id UUID PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  course_name TEXT NOT NULL DEFAULT '',
  instructor_name TEXT NOT NULL DEFAULT '',
  citation_style TEXT NOT NULL DEFAULT 'APA' CHECK (citation_style IN ('APA', 'MLA')),
  target_word_count INTEGER NOT NULL DEFAULT 1000 CHECK (target_word_count BETWEEN 250 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS writing_profiles_owner_idx ON writing_profiles (owner_uid, updated_at DESC);
