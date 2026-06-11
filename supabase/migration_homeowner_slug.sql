-- Add slug column to homeowner_profiles for public showcase (/h/[slug])
-- Run this in Supabase Studio SQL Editor

ALTER TABLE public.homeowner_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS homeowner_profiles_slug_idx
  ON public.homeowner_profiles (slug)
  WHERE slug IS NOT NULL;
