-- Homeowner lead requests — submitted via the public "Get Quotes" form.
-- Each row fans out into leads on matching contractor pipelines.

CREATE TABLE IF NOT EXISTS public.homeowner_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contact
  name              TEXT        NOT NULL,
  phone             TEXT,
  email             TEXT,

  -- Job details
  service_type      TEXT        NOT NULL,
  description       TEXT        NOT NULL,

  -- Location
  city              TEXT,
  state             TEXT,
  zip               TEXT,

  -- Urgency
  urgency           TEXT        NOT NULL DEFAULT 'flexible',
  -- 'flexible' | 'within_month' | 'within_week' | 'asap'

  -- Routing results
  status            TEXT        NOT NULL DEFAULT 'pending',
  -- 'pending' | 'matched' | 'no_match'
  matched_org_count INT         NOT NULL DEFAULT 0,
  lead_ids          UUID[]      NOT NULL DEFAULT '{}'
);

ALTER TABLE public.homeowner_requests ENABLE ROW LEVEL SECURITY;
-- RLS: service role bypasses all policies (used by the API route).
-- No anon/authenticated SELECT policy = reads are blocked for end users.
-- INSERT policy for public submissions should be added via Supabase Studio
-- if you want anon key to submit directly (the API route uses service role, so not required).
