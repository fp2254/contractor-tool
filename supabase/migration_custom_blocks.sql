-- Adds custom_blocks JSONB column to public_profiles
-- Run in Supabase Studio → SQL Editor

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS custom_blocks JSONB NOT NULL DEFAULT '[]';
