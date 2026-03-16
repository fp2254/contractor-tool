-- ============================================================
-- ACTIVITY LOG TABLE
-- Run once in Supabase SQL Editor
-- ============================================================

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

CREATE POLICY "org_members_rw_activity_log" ON public.activity_log
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS activity_log_org_idx
  ON public.activity_log (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_entity_idx
  ON public.activity_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS activity_log_user_idx
  ON public.activity_log (user_id);
