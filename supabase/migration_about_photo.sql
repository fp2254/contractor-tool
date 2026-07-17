-- Add about_photo column to public_profiles
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS about_photo TEXT DEFAULT '';
