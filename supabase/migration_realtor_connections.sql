-- Run once in Supabase Studio SQL Editor
-- Task #56 & #57: Realtor connections, contacts, and work requests

-- 1. Realtor-to-contractor connection requests
CREATE TABLE IF NOT EXISTS public.realtor_connections (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_profile_id UUID NOT NULL REFERENCES public.realtor_profiles(id) ON DELETE CASCADE,
  org_id             UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','accepted','declined','canceled')),
  message            TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (realtor_profile_id, org_id)
);
ALTER TABLE public.realtor_connections ENABLE ROW LEVEL SECURITY;

-- Realtors can manage their own requests; admin client used by app bypasses this
DROP POLICY IF EXISTS "rc_realtor_own" ON public.realtor_connections;
CREATE POLICY "rc_realtor_own" ON public.realtor_connections
  FOR ALL USING (
    realtor_profile_id IN (
      SELECT id FROM public.realtor_profiles WHERE user_id = auth.uid()
    )
  );

-- Org members can view + respond to connections for their org
DROP POLICY IF EXISTS "rc_org_member" ON public.realtor_connections;
CREATE POLICY "rc_org_member" ON public.realtor_connections
  FOR ALL USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS rc_realtor_idx ON public.realtor_connections (realtor_profile_id);
CREATE INDEX IF NOT EXISTS rc_org_idx    ON public.realtor_connections (org_id);

-- 2. Realtor's private contact list (people they refer to contractors)
CREATE TABLE IF NOT EXISTS public.realtor_contacts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_profile_id UUID NOT NULL REFERENCES public.realtor_profiles(id) ON DELETE CASCADE,
  name               TEXT NOT NULL DEFAULT '',
  phone              TEXT,
  email              TEXT,
  company            TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.realtor_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rcontact_own" ON public.realtor_contacts;
CREATE POLICY "rcontact_own" ON public.realtor_contacts
  FOR ALL USING (
    realtor_profile_id IN (
      SELECT id FROM public.realtor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS rcontact_realtor_idx ON public.realtor_contacts (realtor_profile_id);

-- 3. Add realtor-origin columns to leads (safe, additive only)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_realtor_request    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS realtor_connection_id UUID REFERENCES public.realtor_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS realtor_profile_id    UUID REFERENCES public.realtor_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_realtor_req_idx ON public.leads (org_id) WHERE is_realtor_request = true;
