-- Quote Confidence Booster: add scope and estimated time to quotes
-- Run this in Supabase SQL Editor

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS scope_items TEXT,
  ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(100);
