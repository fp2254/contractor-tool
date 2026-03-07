-- Run this once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql/new

CREATE TABLE IF NOT EXISTS referral_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  org_id      UUID NOT NULL,
  code        VARCHAR(16) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org_id   UUID NOT NULL,
  referrer_user_id  UUID NOT NULL,
  code              VARCHAR(16) NOT NULL,
  referred_email    VARCHAR(255),
  referred_user_id  UUID,
  status            VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org_id     UUID NOT NULL,
  referrer_user_id    UUID NOT NULL,
  referred_user_id    UUID NOT NULL,
  amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
  subscription_month  VARCHAR(7) NOT NULL,
  status              VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
