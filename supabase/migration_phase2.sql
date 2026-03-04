-- Phase 2 Migration: org_settings + service_presets
-- Run this in the Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql

-- ============================================================
-- ORG SETTINGS TABLE (one row per org)
-- ============================================================
create table if not exists public.org_settings (
  org_id uuid primary key references public.orgs(id) on delete cascade,

  -- Business Identity
  dba_name text,
  logo_url text,
  primary_phone text,
  business_email text,
  website text,
  address text,
  city text,
  state text,
  zip text,
  license_number text,
  insurance_number text,
  epa_cert_number text,
  service_area text,

  -- Signature Block
  owner_name text,
  owner_title text,
  signature_footer text,

  -- Quote Defaults
  quote_expiration_days int default 14,
  quote_default_status text default 'draft',
  quote_notes_template text,
  quote_number_format text default 'QUO-{N}',
  default_tax_rate numeric(5,2) default 0,
  tax_applied_auto boolean default false,
  deposit_type text default 'none',
  deposit_value numeric(10,2),

  -- Invoice Defaults
  payment_terms text default 'net14',
  invoice_number_format text default 'INV-{N}',
  invoice_footer_template text,
  late_fee_percentage numeric(5,2),
  late_fee_grace_days int,

  -- Payment Settings
  accepted_payment_methods text default 'cash,check,card',
  payment_instructions text,

  -- Automation
  quote_followup_days text default '3,7',
  invoice_reminder_before int,
  invoice_reminder_after int,
  quote_sent_template text,
  invoice_reminder_template text,

  updated_at timestamptz default now()
);

alter table public.org_settings enable row level security;

create policy "org_owner_rw_settings" on public.org_settings for all
  using (org_id in (select id from public.orgs where owner_user_id = auth.uid()));

-- ============================================================
-- SERVICE PRESETS TABLE
-- ============================================================
create table if not exists public.service_presets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  service_name text not null,
  description text,
  price_type text not null default 'flat'
    check (price_type in ('flat','hourly')),
  flat_rate numeric(10,2),
  hourly_rate numeric(10,2),
  estimated_hours numeric(5,2),
  material_cost numeric(10,2),
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.service_presets enable row level security;

create policy "org_members_rw_presets" on public.service_presets for all
  using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

create index if not exists service_presets_org_idx on public.service_presets(org_id);
