-- Run once in Supabase Studio SQL Editor
-- Adds self-reported showcase stats + banner image to realtor_profiles

ALTER TABLE public.realtor_profiles
  ADD COLUMN IF NOT EXISTS years_experience INT,
  ADD COLUMN IF NOT EXISTS homes_sold        INT,
  ADD COLUMN IF NOT EXISTS sales_volume      BIGINT,
  ADD COLUMN IF NOT EXISTS banner_url        TEXT;
