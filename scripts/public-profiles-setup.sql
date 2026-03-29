-- Public Contractor Profiles — run this in Supabase Studio (SQL Editor)
-- Stores all data for the /pro/[slug] public profile page.
-- One row per org. Created on first save from Business Profile > Public Profile.

CREATE TABLE IF NOT EXISTS public_profiles (
  org_id           uuid        PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  slug             text        UNIQUE NOT NULL,
  is_published     boolean     NOT NULL DEFAULT false,
  trade            text        NOT NULL DEFAULT '',
  tagline          text        NOT NULL DEFAULT '',
  phone            text        NOT NULL DEFAULT '',
  service_area     text        NOT NULL DEFAULT '',
  urgency_line     text        NOT NULL DEFAULT '',
  years_experience integer     NOT NULL DEFAULT 0,
  revenue_display  text        NOT NULL DEFAULT '',
  services         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  about_bullets    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  license_text     text        NOT NULL DEFAULT '',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_profiles_slug_idx ON public_profiles(slug);
CREATE INDEX IF NOT EXISTS public_profiles_org_id_idx ON public_profiles(org_id);
