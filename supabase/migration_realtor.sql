-- Run once in Supabase Studio SQL Editor
-- Realtor account type — separate from contractor orgs, mirrors the homeowner_profiles pattern.

CREATE TABLE IF NOT EXISTS public.realtor_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT NOT NULL DEFAULT '',
  agency_name      TEXT,
  license_number   TEXT,
  phone            TEXT,
  bio              TEXT,
  avatar_url       TEXT,
  service_area     TEXT,
  slug             TEXT UNIQUE,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  profile_completion INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.realtor_profiles ENABLE ROW LEVEL SECURITY;

-- Owners manage their own row (service role used by the app bypasses this anyway)
DROP POLICY IF EXISTS "realtor_own_profile" ON public.realtor_profiles;
CREATE POLICY "realtor_own_profile" ON public.realtor_profiles
  FOR ALL USING (user_id = auth.uid());

-- Published realtor profiles are publicly readable (for /agent/[slug])
DROP POLICY IF EXISTS "realtor_public_profile_read" ON public.realtor_profiles;
CREATE POLICY "realtor_public_profile_read" ON public.realtor_profiles
  FOR SELECT USING (is_published = true);

CREATE INDEX IF NOT EXISTS realtor_profiles_user_idx ON public.realtor_profiles (user_id);
CREATE INDEX IF NOT EXISTS realtor_profiles_slug_idx ON public.realtor_profiles (slug) WHERE slug IS NOT NULL;
