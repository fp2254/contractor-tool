-- Payment Notifications table for manual billing management
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS payment_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_name       TEXT NOT NULL,
  payer_email      TEXT NOT NULL,
  plan_type        TEXT NOT NULL DEFAULT 'monthly',
  amount           DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_date     DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending_review',
  matched_org_id   UUID,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_notifications_status_idx
  ON payment_notifications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_notifications_email_idx
  ON payment_notifications (payer_email);
