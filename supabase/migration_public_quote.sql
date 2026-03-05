-- Public Quote Link Migration
-- Adds public_token (unique shareable URL token) and accepted_signature_name to quotes

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE DEFAULT gen_random_uuid() NOT NULL,
  ADD COLUMN IF NOT EXISTS accepted_signature_name TEXT;

-- Backfill any existing rows that somehow have NULL (shouldn't happen with DEFAULT but safety)
UPDATE public.quotes
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

-- Index for fast lookups by token
CREATE UNIQUE INDEX IF NOT EXISTS quotes_public_token_idx ON public.quotes (public_token);
