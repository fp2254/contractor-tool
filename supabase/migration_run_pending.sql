-- ============================================================
-- TradeBase — All Pending Migrations (combined, run in order)
-- Paste this entire block into Supabase Studio → SQL Editor
-- https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql
-- ============================================================

-- ── Phase 11: Add-on Subscriptions (migration_addons.sql) ──

create table if not exists org_addons (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  addon_type        text not null,
  status            text not null default 'active'
                      check (status in ('active', 'trialing', 'canceled', 'paused')),
  price_monthly     numeric(10,2),
  activated_at      timestamptz default now(),
  current_period_end timestamptz,
  notes             text,
  created_at        timestamptz default now(),
  unique (org_id, addon_type)
);

alter table org_addons enable row level security;

create policy "org_addons_select"
  on org_addons for select
  using (
    org_id in (
      select om.org_id from org_members om where om.user_id = auth.uid()
    )
  );

-- ── Phase 11b: Add-on Billing Columns (migration_addons_v2.sql) ──

alter table org_addons add column if not exists external_subscription_id text;
alter table org_addons add column if not exists billing_provider text default 'lemonsqueezy';

alter table org_addons drop constraint if exists org_addons_status_check;

alter table org_addons
  add constraint org_addons_status_check
  check (status in ('active', 'trialing', 'canceled', 'paused', 'past_due', 'unpaid'));

-- ── Phase 12: Phone System (migration_phone_system.sql) ──

create table if not exists org_phone_numbers (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  twilio_sid      text not null,
  e164_number     text not null,
  retell_agent_id text,
  retell_llm_id   text,
  status          text not null default 'active',
  created_at      timestamptz default now(),
  unique (org_id),
  unique (e164_number)
);

alter table org_phone_numbers enable row level security;

create policy "org_phone_numbers_select"
  on org_phone_numbers for select
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));

create table if not exists org_phone_settings (
  org_id                    uuid primary key references orgs(id) on delete cascade,
  routing_mode              text not null default 'ai_fallback'
                              check (routing_mode in ('contractor_first', 'ai_first', 'simultaneous', 'ai_fallback')),
  contractor_forward_number text,
  ring_timeout_seconds      int not null default 20,
  record_calls              boolean not null default true,
  missed_call_sms_enabled   boolean not null default true,
  missed_call_sms_template  text not null default 'Hi! You just called {business_name}. We missed you — we''ll call you back shortly. Thanks!',
  updated_at                timestamptz default now()
);

alter table org_phone_settings enable row level security;

create policy "org_phone_settings_select"
  on org_phone_settings for select
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));

create table if not exists call_logs (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs(id) on delete cascade,
  twilio_call_sid     text unique,
  direction           text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  from_number         text,
  to_number           text,
  status              text not null default 'in_progress',
  duration_seconds    int,
  recording_url       text,
  recording_sid       text,
  caller_name         text,
  customer_id         uuid references customers(id) on delete set null,
  lead_id             uuid references leads(id) on delete set null,
  retell_call_id      text,
  answered_by         text,
  routing_mode_used   text,
  missed_call_sms_sent boolean not null default false,
  started_at          timestamptz default now(),
  ended_at            timestamptz,
  created_at          timestamptz default now()
);

create index if not exists call_logs_org_id_idx on call_logs (org_id, started_at desc);
create index if not exists call_logs_customer_id_idx on call_logs (customer_id);
create index if not exists call_logs_from_number_idx on call_logs (from_number);

alter table call_logs enable row level security;

create policy "call_logs_select"
  on call_logs for select
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));

create table if not exists call_transcripts (
  id            uuid primary key default gen_random_uuid(),
  call_log_id   uuid unique not null references call_logs(id) on delete cascade,
  org_id        uuid not null references orgs(id) on delete cascade,
  transcript    jsonb,
  ai_summary    text,
  sentiment     text,
  created_at    timestamptz default now()
);

alter table call_transcripts enable row level security;

create policy "call_transcripts_select"
  on call_transcripts for select
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));

-- ── Public Profile: Section config + trust highlights (migration_sections_config.sql) ──

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS sections_config  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trust_highlights JSONB NOT NULL DEFAULT '[]';

-- ── Public Profile: Custom blocks (migration_custom_blocks.sql) ──

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS custom_blocks JSONB NOT NULL DEFAULT '[]';
