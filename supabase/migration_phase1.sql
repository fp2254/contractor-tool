-- Phase 1 Migration: leads, payments, notes
-- Run this in the Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql

-- ============================================================
-- LEADS TABLE
-- ============================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  lead_source text,
  job_type text,
  notes text,
  status text not null default 'new'
    check (status in ('new','contacted','quoted','scheduled','won','lost')),
  converted_customer_id uuid references public.customers(id),
  created_by_user uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "org_members_rw_leads" on public.leads for all
  using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

create index if not exists leads_org_id_idx on public.leads(org_id);
create index if not exists leads_status_idx on public.leads(status);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  amount numeric(10,2) not null,
  payment_method text not null default 'cash'
    check (payment_method in ('cash','check','card','venmo','paypal','other')),
  payment_date date not null default current_date,
  notes text,
  created_by_user uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "org_members_rw_payments" on public.payments for all
  using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

create index if not exists payments_org_id_idx on public.payments(org_id);
create index if not exists payments_invoice_id_idx on public.payments(invoice_id);

-- ============================================================
-- NOTES TABLE
-- ============================================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  entity_type text not null
    check (entity_type in ('lead','customer','job','invoice','quote')),
  entity_id uuid not null,
  body text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "org_members_rw_notes" on public.notes for all
  using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

create index if not exists notes_entity_idx on public.notes(entity_type, entity_id);
create index if not exists notes_org_id_idx on public.notes(org_id);

-- ============================================================
-- ADD quote_id to jobs (for quote → job conversion tracking)
-- ============================================================
alter table public.jobs
  add column if not exists quote_id uuid references public.quotes(id),
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text;
