-- Customers: add archived flag
-- Run this once in Supabase SQL Editor

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS customers_org_archived_idx
  ON customers (org_id, archived);
