-- Add logo_url column to org_settings (safe to run multiple times)
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
