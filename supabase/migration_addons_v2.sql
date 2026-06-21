-- Extend org_addons for Lemon Squeezy subscription tracking
alter table org_addons add column if not exists external_subscription_id text;
alter table org_addons add column if not exists billing_provider text default 'lemonsqueezy';
