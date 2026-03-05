-- Migration: Trade Contacts
-- Run in Supabase SQL Editor

create table if not exists trade_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  company text,
  trade text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists trade_contacts_org_id_idx on trade_contacts(org_id);

alter table trade_contacts enable row level security;

create policy "org members can manage trade contacts"
  on trade_contacts for all
  using (org_id in (select org_id from org_members where user_id = auth.uid()));
