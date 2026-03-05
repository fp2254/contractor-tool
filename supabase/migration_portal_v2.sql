-- ============================================================
-- Portal V2 Migration
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql
-- ============================================================

-- 1. Extend customer_portal_tokens with new columns
ALTER TABLE public.customer_portal_tokens
  ADD COLUMN IF NOT EXISTS quote_id   UUID REFERENCES public.quotes(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2. Create quote_signatures table
CREATE TABLE IF NOT EXISTS public.quote_signatures (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  quote_id         UUID        NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  portal_token_id  UUID        REFERENCES public.customer_portal_tokens(id) ON DELETE SET NULL,
  signer_name      TEXT        NOT NULL,
  signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_data   TEXT,        -- base64-encoded PNG of the drawn signature
  ip_address       TEXT,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quote_signatures_quote_idx
  ON public.quote_signatures (quote_id);

-- Row-level security: only allow service role (admin client) to read/write
ALTER TABLE public.quote_signatures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quote_signatures'
    AND policyname = 'service_role_all_signatures'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_all_signatures"
      ON public.quote_signatures FOR ALL
      USING (true) WITH CHECK (true)';
  END IF;
END $$;
