-- Payment links: stores contractor-owned payment handles (Venmo, Zelle, Cash App, PayPal, custom)
-- Run once in Supabase Studio → SQL Editor

ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS payment_links JSONB NOT NULL DEFAULT '{}';

-- payment_links shape (all keys optional):
-- {
--   venmo:   "@handle",
--   cashapp: "$CashTag",
--   paypal:  "username",   -- becomes paypal.me/username
--   zelle:   "phone or email",
--   custom_label: "label text",
--   custom_url:   "https://..."
-- }
