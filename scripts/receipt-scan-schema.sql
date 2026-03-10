-- Receipt Scan / Expenses
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL,
  vendor        TEXT NOT NULL DEFAULT '',
  receipt_date  DATE,
  subtotal      DECIMAL(12, 2),
  tax_amount    DECIMAL(12, 2),
  total_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes         TEXT,
  job_id        UUID REFERENCES jobs(id) ON DELETE SET NULL,
  line_items    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user UUID
);

CREATE INDEX IF NOT EXISTS expenses_org_idx       ON expenses (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS expenses_org_job_idx   ON expenses (org_id, job_id);
