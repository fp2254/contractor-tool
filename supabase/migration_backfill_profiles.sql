-- Backfill: create a public_profiles row for every org that doesn't have one yet.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- Run this once in Supabase Studio → SQL Editor.

DO $$
DECLARE
  org_row RECORD;
  base_slug TEXT;
  final_slug TEXT;
  attempt INT;
BEGIN
  FOR org_row IN
    SELECT o.id, o.name
    FROM orgs o
    WHERE NOT EXISTS (
      SELECT 1 FROM public_profiles pp WHERE pp.org_id = o.id
    )
  LOOP
    -- Slugify: lowercase, strip non-alphanum, replace spaces with hyphens
    base_slug := lower(
      regexp_replace(
        regexp_replace(trim(org_row.name), '[^a-zA-Z0-9\s\-]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := left(base_slug, 80);
    IF base_slug = '' OR base_slug = '-' THEN base_slug := 'contractor'; END IF;

    -- Find a unique slug
    final_slug := base_slug;
    attempt := 0;
    WHILE EXISTS (SELECT 1 FROM public_profiles WHERE slug = final_slug) LOOP
      attempt := attempt + 1;
      final_slug := base_slug || '-' || attempt::text;
      IF attempt > 50 THEN
        final_slug := base_slug || '-' || substr(md5(random()::text), 1, 4);
        EXIT;
      END IF;
    END LOOP;

    INSERT INTO public_profiles (org_id, slug, is_published)
    VALUES (org_row.id, final_slug, false)
    ON CONFLICT (org_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Backfill complete.';
END $$;
