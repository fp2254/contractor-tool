-- Square OAuth credentials stored per org
alter table org_settings
  add column if not exists square_access_token text,
  add column if not exists square_refresh_token text,
  add column if not exists square_merchant_id text,
  add column if not exists square_location_id text,
  add column if not exists square_token_expires_at timestamptz;
