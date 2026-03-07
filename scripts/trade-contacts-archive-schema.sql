-- Trade Contacts: add archived flag
-- Run this in Supabase SQL Editor

ALTER TABLE trade_contacts
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS trade_contacts_org_archived_idx
  ON trade_contacts (org_id, archived);
