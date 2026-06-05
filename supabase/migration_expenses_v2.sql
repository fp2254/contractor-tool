-- Run once in Supabase Studio SQL Editor
-- Adds category + description to expenses, creates activity_log

-- 1. Expenses enhancements
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('materials','labor','fuel','tools','permits','subcontractor','equipment','other'));

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS expenses_category_idx ON public.expenses (org_id, category);

-- 2. Activity log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL,
  user_id       UUID,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  action        TEXT NOT NULL,
  description   TEXT,
  metadata_json JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'activity_log' AND policyname = 'org_members_rw_activity_log'
  ) THEN
    CREATE POLICY "org_members_rw_activity_log" ON public.activity_log
      FOR ALL USING (
        org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS activity_log_org_idx   ON public.activity_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON public.activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_log_user_idx   ON public.activity_log (user_id);
