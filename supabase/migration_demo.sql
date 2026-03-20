-- Demo mode: mark certain orgs as demo orgs so the app can show
-- the demo banner and apply restrictions.

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Index for fast demo-org lookups
CREATE INDEX IF NOT EXISTS orgs_is_demo_idx ON orgs (is_demo) WHERE is_demo = true;
