-- AI Usage Limits — run this in Supabase Studio (SQL Editor)
-- Creates the per-org limit override table used as the billing hook.
-- Until a row exists for an org, the defaults apply:
--   daily_limit  = 50 requests
--   monthly_limit = 500 requests

CREATE TABLE IF NOT EXISTS org_ai_limits (
  org_id        uuid        PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  daily_limit   integer     NOT NULL DEFAULT 50,
  monthly_limit integer     NOT NULL DEFAULT 500,
  plan          text        NOT NULL DEFAULT 'free', -- 'free' | 'pro' | 'unlimited'
  notes         text,
  updated_at    timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS org_ai_limits_org_id_idx ON org_ai_limits(org_id);

-- Example: give an org unlimited AI (paid plan)
-- INSERT INTO org_ai_limits (org_id, daily_limit, monthly_limit, plan)
-- VALUES ('<org-uuid-here>', 999999, 999999, 'unlimited')
-- ON CONFLICT (org_id) DO UPDATE
--   SET daily_limit = EXCLUDED.daily_limit,
--       monthly_limit = EXCLUDED.monthly_limit,
--       plan = EXCLUDED.plan,
--       updated_at = now();

-- Example: give an org a pro plan (500/day, 5000/month)
-- INSERT INTO org_ai_limits (org_id, daily_limit, monthly_limit, plan)
-- VALUES ('<org-uuid-here>', 500, 5000, 'pro')
-- ON CONFLICT (org_id) DO UPDATE
--   SET daily_limit = EXCLUDED.daily_limit,
--       monthly_limit = EXCLUDED.monthly_limit,
--       plan = EXCLUDED.plan,
--       updated_at = now();
