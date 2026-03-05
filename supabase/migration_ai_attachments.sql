-- ============================================================
-- AI Runs + AI Attachments
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql
-- ============================================================

-- 1. ai_runs — one row per AI call
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id      UUID,
  feature      TEXT        NOT NULL,  -- "permit_assistant" | "job_capture" | "voice_job" | etc.
  input_text   TEXT,
  input_json   JSONB,
  output_json  JSONB,
  output_text  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_runs_org_idx ON public.ai_runs (org_id);
CREATE INDEX IF NOT EXISTS ai_runs_feature_idx ON public.ai_runs (org_id, feature);

-- 2. ai_attachments — polymorphic join: ai_run ↔ any entity
CREATE TABLE IF NOT EXISTS public.ai_attachments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  ai_run_id    UUID        NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
  entity_type  TEXT        NOT NULL, -- "lead" | "customer" | "job" | "quote" | "invoice"
  entity_id    UUID        NOT NULL,
  title        TEXT,
  note         TEXT,
  is_pinned    BOOLEAN     NOT NULL DEFAULT false,
  created_by   UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_attach_entity_idx ON public.ai_attachments (org_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ai_attach_run_idx ON public.ai_attachments (org_id, ai_run_id);
