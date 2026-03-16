-- ============================================================
-- ORG SETTINGS — Add missing scalability columns
-- Run once in Supabase SQL Editor
-- All use IF NOT EXISTS so safe to re-run
-- ============================================================

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS quote_terms               TEXT,
  ADD COLUMN IF NOT EXISTS invoice_terms             TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate                  NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS pricing_defaults_json     JSONB,
  ADD COLUMN IF NOT EXISTS ai_settings_json          JSONB,
  ADD COLUMN IF NOT EXISTS workspace_settings_json   JSONB;
