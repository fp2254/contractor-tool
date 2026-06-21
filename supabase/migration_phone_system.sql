-- ──────────────────────────────────────────────────────────────────────────────
-- Phone system tables (requires migration_addons.sql applied first)
-- ──────────────────────────────────────────────────────────────────────────────

-- Per-org Twilio phone number + Retell agent
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

-- Per-org call routing configuration
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

-- Call log — one row per call leg
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
  answered_by         text, -- 'contractor' | 'retell' | null
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

-- Call transcripts — one row per call (Retell provides after call ends)
create table if not exists call_transcripts (
  id            uuid primary key default gen_random_uuid(),
  call_log_id   uuid unique not null references call_logs(id) on delete cascade,
  org_id        uuid not null references orgs(id) on delete cascade,
  transcript    jsonb,         -- array of {role, content, words} from Retell
  ai_summary    text,
  sentiment     text,
  created_at    timestamptz default now()
);

alter table call_transcripts enable row level security;

create policy "call_transcripts_select"
  on call_transcripts for select
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));
