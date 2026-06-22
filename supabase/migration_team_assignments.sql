-- ============================================================
-- TradeBase — Team Assignments
-- Paste into Supabase Studio → SQL Editor
-- https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql
-- ============================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS jobs_assigned_to_idx    ON jobs    (assigned_to);
CREATE INDEX IF NOT EXISTS quotes_assigned_to_idx  ON quotes  (assigned_to);
CREATE INDEX IF NOT EXISTS invoices_assigned_to_idx ON invoices (assigned_to);
