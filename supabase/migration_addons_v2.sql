-- Extend org_addons for Lemon Squeezy subscription tracking

-- 1. Add new columns for billing provider tracking
alter table org_addons add column if not exists external_subscription_id text;
alter table org_addons add column if not exists billing_provider text default 'lemonsqueezy';

-- 2. Extend the status check constraint to allow payment-failure states
--    PostgreSQL auto-names inline constraints as <table>_<column>_check
alter table org_addons drop constraint if exists org_addons_status_check;

alter table org_addons
  add constraint org_addons_status_check
  check (status in ('active', 'trialing', 'canceled', 'paused', 'past_due', 'unpaid'));
