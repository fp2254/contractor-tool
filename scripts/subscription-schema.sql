-- Subscriptions table for TradeBase billing
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL UNIQUE,
  user_id               UUID NOT NULL,
  plan_type             TEXT NOT NULL DEFAULT 'monthly',
  payment_date          TIMESTAMPTZ,
  next_due_date         TIMESTAMPTZ,
  grace_period_end_date TIMESTAMPTZ,
  subscription_status   TEXT NOT NULL DEFAULT 'active',
  payment_provider_id   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_org_idx
  ON subscriptions (org_id);

CREATE INDEX IF NOT EXISTS subscriptions_provider_idx
  ON subscriptions (payment_provider_id)
  WHERE payment_provider_id IS NOT NULL;

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();
