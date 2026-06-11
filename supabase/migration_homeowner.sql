-- Run once in Supabase Studio SQL Editor
-- Homeowner portal tables

-- 1. Homeowner profiles
CREATE TABLE IF NOT EXISTS public.homeowner_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT NOT NULL DEFAULT '',
  avatar_url       TEXT,
  banner_url       TEXT,
  location         TEXT,
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  is_profile_public BOOLEAN NOT NULL DEFAULT true,
  profile_completion INT NOT NULL DEFAULT 0,
  member_since     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Homeowner properties
CREATE TABLE IF NOT EXISTS public.homeowner_properties (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id     UUID NOT NULL REFERENCES public.homeowner_profiles(id) ON DELETE CASCADE,
  property_type    TEXT NOT NULL DEFAULT 'Single Family Home',
  sq_footage       INT,
  lot_size         TEXT,
  year_built       INT,
  bedrooms         INT,
  bathrooms        NUMERIC(3,1),
  address          TEXT,
  city             TEXT,
  state            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Homeowner projects (completed work)
CREATE TABLE IF NOT EXISTS public.homeowner_projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id      UUID NOT NULL REFERENCES public.homeowner_profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  contractor_name   TEXT,
  contractor_org_id UUID,
  description       TEXT,
  cost              NUMERIC(12,2),
  project_date      DATE,
  completed_date    DATE,
  rating            NUMERIC(2,1),
  review_text       TEXT,
  has_warranty      BOOLEAN NOT NULL DEFAULT false,
  has_documentation BOOLEAN NOT NULL DEFAULT false,
  photos            JSONB DEFAULT '[]',
  status            TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('in_progress','completed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Future projects
CREATE TABLE IF NOT EXISTS public.homeowner_future_projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id     UUID NOT NULL REFERENCES public.homeowner_profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning','researching','considering')),
  cover_image_url  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Property scorecard
CREATE TABLE IF NOT EXISTS public.homeowner_scorecard (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id     UUID NOT NULL REFERENCES public.homeowner_profiles(id) ON DELETE CASCADE,
  category         TEXT NOT NULL,
  score_status     TEXT NOT NULL DEFAULT 'unknown'
    CHECK (score_status IN ('excellent','good','fair','needs_attention','mitigated','unknown')),
  notes            TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (homeowner_id, category)
);

-- RLS
ALTER TABLE public.homeowner_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_properties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_future_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_scorecard       ENABLE ROW LEVEL SECURITY;

-- Owner policies (service role used by app bypasses these)
CREATE POLICY "homeowner_own_profile" ON public.homeowner_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "homeowner_own_properties" ON public.homeowner_properties
  FOR ALL USING (
    homeowner_id IN (SELECT id FROM public.homeowner_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "homeowner_own_projects" ON public.homeowner_projects
  FOR ALL USING (
    homeowner_id IN (SELECT id FROM public.homeowner_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "homeowner_own_future_projects" ON public.homeowner_future_projects
  FOR ALL USING (
    homeowner_id IN (SELECT id FROM public.homeowner_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "homeowner_own_scorecard" ON public.homeowner_scorecard
  FOR ALL USING (
    homeowner_id IN (SELECT id FROM public.homeowner_profiles WHERE user_id = auth.uid())
  );

-- Public profile reads
CREATE POLICY "homeowner_public_profile_read" ON public.homeowner_profiles
  FOR SELECT USING (is_profile_public = true);

CREATE POLICY "homeowner_public_projects_read" ON public.homeowner_projects
  FOR SELECT USING (
    homeowner_id IN (SELECT id FROM public.homeowner_profiles WHERE is_profile_public = true)
  );

-- Slug for public showcase (/h/[slug])
ALTER TABLE public.homeowner_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Indexes
CREATE INDEX IF NOT EXISTS homeowner_profiles_user_idx  ON public.homeowner_profiles (user_id);
CREATE INDEX IF NOT EXISTS homeowner_profiles_slug_idx  ON public.homeowner_profiles (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS homeowner_projects_owner_idx ON public.homeowner_projects (homeowner_id, project_date DESC);
CREATE INDEX IF NOT EXISTS homeowner_future_owner_idx   ON public.homeowner_future_projects (homeowner_id);
