-- Adds preferred_website_source to org_settings
-- Values: 'external' (their own website) | 'tradebase' (the /pro/[slug] page)
-- Defaults to null (app derives sensible default at runtime)
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS preferred_website_source text;
