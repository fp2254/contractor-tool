-- ─────────────────────────────────────────────────────────────────────────────
-- AI Assistant per-org configuration
-- Run in Supabase Studio → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists org_ai_assistant_config (
  org_id                    uuid primary key references orgs(id) on delete cascade,

  -- Master switch
  enabled                   boolean not null default false,

  -- Behaviour toggles
  auto_reply                boolean not null default false,
  ai_schedules              boolean not null default false,
  voicemail_only            boolean not null default false,
  full_conversation         boolean not null default false,
  require_booking_approval  boolean not null default true,
  show_pricing              boolean not null default false,
  transcribe_voicemail      boolean not null default false,

  -- Identity
  greeting_name             text,
  tone                      text not null default 'casual' check (tone in ('casual','professional')),

  -- Availability
  business_hours            jsonb not null default '{"days":["mon","tue","wed","thu","fri"],"open":"07:00","close":"17:00"}'::jsonb,
  service_area              text,

  -- Service preset gating (array of preset IDs to EXCLUDE from AI context)
  disabled_service_ids      jsonb not null default '[]'::jsonb,

  -- Pricing ranges per service: [{preset_id, label, min, max}]
  pricing_ranges            jsonb not null default '[]'::jsonb,

  -- Qualifier questions asked in order: ["Is this insurance related?", ...]
  qualifier_questions       jsonb not null default '[]'::jsonb,

  -- FAQ pairs: [{q, a}]
  faqs                      jsonb not null default '[]'::jsonb,

  -- Follow-up cadence
  followup_max_attempts     int not null default 2 check (followup_max_attempts between 1 and 5),
  followup_delay_days       int not null default 3 check (followup_delay_days between 1 and 14),

  updated_at                timestamptz default now()
);

alter table org_ai_assistant_config enable row level security;

create policy "ai_assistant_config_select"
  on org_ai_assistant_config for select
  using (org_id in (
    select om.org_id from org_members om where om.user_id = auth.uid()
  ));
