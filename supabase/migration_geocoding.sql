-- ============================================================
-- GEOCODING — Add lat/lng to org_settings
-- Run once in Supabase SQL Editor
-- Safe to re-run (IF NOT EXISTS on all columns)
-- ============================================================

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS lat           NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS lng           NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS geocoded_at   TIMESTAMPTZ;

-- Index for fast geo queries on the find-contractors page
CREATE INDEX IF NOT EXISTS org_settings_lat_lng_idx
  ON public.org_settings (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
