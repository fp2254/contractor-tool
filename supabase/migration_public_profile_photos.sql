-- Adds photos JSONB column to public_profiles (project gallery photos for /pro/[slug])
-- Run in Supabase Studio → SQL Editor
--
-- Without this column, the public-profile save API silently drops it (and,
-- prior to the fallback fix, dropped ALL other optional fields including
-- selected_template) on every save because the DB rejected the write.

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;
