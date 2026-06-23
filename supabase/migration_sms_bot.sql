-- ─────────────────────────────────────────────────────────────────────────────
-- AI SMS Bot — conversations, messages, opt-outs, pending bookings
-- Run AFTER migration_ai_assistant_config.sql
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists sms_conversations (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references orgs(id) on delete cascade,
  lead_id               uuid references leads(id) on delete set null,
  from_number           text not null,   -- customer phone (E.164)
  to_number             text not null,   -- org Twilio number (E.164)
  status                text not null default 'active'
                          check (status in ('active', 'handed_off', 'opted_out', 'exhausted')),
  followup_attempts     int not null default 0,  -- proactive follow-ups sent without a customer reply
  last_customer_reply_at timestamptz,            -- set every time an inbound message arrives
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists sms_conversations_org_id_idx  on sms_conversations (org_id, created_at desc);
create index if not exists sms_conversations_lead_id_idx on sms_conversations (lead_id);
create index if not exists sms_conversations_from_idx    on sms_conversations (from_number, org_id);

alter table sms_conversations enable row level security;
create policy "sms_conversations_select" on sms_conversations for select
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists sms_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references sms_conversations(id) on delete cascade,
  direction       text not null check (direction in ('inbound', 'outbound')),
  body            text not null,
  sent_at         timestamptz default now()
);

create index if not exists sms_messages_conversation_idx on sms_messages (conversation_id, sent_at asc);

alter table sms_messages enable row level security;
create policy "sms_messages_select" on sms_messages for select
  using (
    conversation_id in (
      select sc.id from sms_conversations sc
      where sc.org_id in (select om.org_id from org_members om where om.user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists opted_out_numbers (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  phone_number text not null,
  opted_out_at timestamptz default now(),
  unique (org_id, phone_number)
);

alter table opted_out_numbers enable row level security;
create policy "opted_out_numbers_select" on opted_out_numbers for select
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Durable pending-confirmation state for AI-detected bookings.
-- Contractor sees these in the activity log (/app/activity) and on the lead
-- detail page. When they confirm: update status → 'confirmed' and create a job.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists sms_pending_bookings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  conversation_id uuid references sms_conversations(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  job_id          uuid references jobs(id) on delete set null,  -- set when promoted
  job_type        text,
  booking_date    date,
  booking_time    text,   -- e.g. "9am-12pm"
  status          text not null default 'pending_approval'
                    check (status in ('pending_approval', 'confirmed', 'cancelled')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists sms_pending_bookings_org_idx  on sms_pending_bookings (org_id, created_at desc);
create index if not exists sms_pending_bookings_lead_idx on sms_pending_bookings (lead_id);

alter table sms_pending_bookings enable row level security;
create policy "sms_pending_bookings_select" on sms_pending_bookings for select
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));
create policy "sms_pending_bookings_update" on sms_pending_bookings for update
  using (org_id in (select om.org_id from org_members om where om.user_id = auth.uid()));
