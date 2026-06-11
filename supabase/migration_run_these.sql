-- ============================================================
-- TradeBase — Run these in Supabase Studio SQL Editor
-- All statements use IF NOT EXISTS / IF EXISTS so safe to re-run
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. PROJECTS (portfolio / completed work showcase)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'completed',
  location     TEXT NOT NULL DEFAULT '',
  completed_at DATE,
  photos       JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  cost         NUMERIC(12,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_org_id_idx ON public.projects (org_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members manage projects" ON public.projects;
CREATE POLICY "org members manage projects" ON public.projects
  USING  (org_id = ANY(user_org_ids()))
  WITH CHECK (org_id = ANY(user_org_ids()));


-- ──────────────────────────────────────────────────────────────
-- 2. EXPENSES — category + description columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('materials','labor','fuel','tools','permits','subcontractor','equipment','other'));

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS expenses_category_idx ON public.expenses (org_id, category);


-- ──────────────────────────────────────────────────────────────
-- 3. ACTIVITY LOG
-- ──────────────────────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS activity_log_org_idx    ON public.activity_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON public.activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_log_user_idx   ON public.activity_log (user_id);


-- ──────────────────────────────────────────────────────────────
-- 4. ORG SETTINGS — extra columns for quotes/invoices/AI
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS quote_terms             TEXT,
  ADD COLUMN IF NOT EXISTS invoice_terms           TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate                NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS pricing_defaults_json   JSONB,
  ADD COLUMN IF NOT EXISTS ai_settings_json        JSONB,
  ADD COLUMN IF NOT EXISTS workspace_settings_json JSONB;


-- ──────────────────────────────────────────────────────────────
-- 5. PERFORMANCE INDEXES (safe to skip if already exist)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS customers_org_idx       ON public.customers   (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_org_idx          ON public.quotes      (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_customer_idx     ON public.quotes      (customer_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx       ON public.quotes      (status);
CREATE INDEX IF NOT EXISTS quote_items_quote_idx   ON public.quote_items (quote_id);
CREATE INDEX IF NOT EXISTS quote_items_org_idx     ON public.quote_items (org_id);
CREATE INDEX IF NOT EXISTS jobs_org_idx            ON public.jobs        (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_customer_idx       ON public.jobs        (customer_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx         ON public.jobs        (status);
CREATE INDEX IF NOT EXISTS jobs_scheduled_date_idx ON public.jobs        (scheduled_date);
CREATE INDEX IF NOT EXISTS invoices_org_idx        ON public.invoices    (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_customer_idx   ON public.invoices    (customer_id);
CREATE INDEX IF NOT EXISTS leads_org_idx           ON public.leads       (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx        ON public.leads       (status);
