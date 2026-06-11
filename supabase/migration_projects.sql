-- Projects table: contractor portfolio / completed work log
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'completed', -- 'in_progress' | 'completed'
  location    TEXT NOT NULL DEFAULT '',
  completed_at DATE,
  photos      JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{url, caption}]
  tags        TEXT[] NOT NULL DEFAULT '{}',
  cost        NUMERIC(12,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_org_id_idx ON projects(org_id);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members manage projects" ON projects;
CREATE POLICY "org members manage projects" ON projects
  USING (org_id = ANY(user_org_ids()))
  WITH CHECK (org_id = ANY(user_org_ids()));
