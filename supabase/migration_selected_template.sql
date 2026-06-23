-- Adds selected_template column to public_profiles
-- Run in Supabase Studio → SQL Editor

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS selected_template TEXT NOT NULL DEFAULT 'classic';
