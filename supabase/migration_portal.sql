-- Customer portal tokens
CREATE TABLE IF NOT EXISTS public.customer_portal_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id UUID        NOT NULL,
  token       TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portal_tokens_token_idx ON public.customer_portal_tokens (token);
CREATE INDEX IF NOT EXISTS portal_tokens_customer_idx ON public.customer_portal_tokens (org_id, customer_id);
