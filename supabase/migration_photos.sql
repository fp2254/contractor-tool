-- Photos table for job, customer, lead, and invoice attachments
CREATE TABLE IF NOT EXISTS public.photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  entity_type TEXT        NOT NULL CHECK (entity_type IN ('job','customer','lead','invoice')),
  entity_id   UUID        NOT NULL,
  storage_path TEXT       NOT NULL,
  url         TEXT        NOT NULL,
  filename    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS photos_entity_idx ON public.photos (org_id, entity_type, entity_id);

-- Supabase Storage bucket (run in Supabase SQL editor or the JS client)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tradebase-photos', 'tradebase-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (allow service role to do everything)
CREATE POLICY "Public read tradebase-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'tradebase-photos');
