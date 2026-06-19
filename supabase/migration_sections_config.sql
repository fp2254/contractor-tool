-- Public profile: section visibility controls + custom trust highlights
-- Run this in Supabase Studio → SQL Editor

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS sections_config  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trust_highlights JSONB NOT NULL DEFAULT '[]';
