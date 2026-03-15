-- Add default warranty text column to org_settings (safe to run multiple times)
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS default_warranty_text TEXT;
