-- Adds geocoding columns to realtor_profiles so realtors can be shown on the
-- public find-contractors map alongside contractors.
ALTER TABLE public.realtor_profiles
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;
