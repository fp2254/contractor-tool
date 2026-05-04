-- Job Templates Migration – Phase 1 Foundation
-- Run in Supabase SQL Editor (safe, additive – does NOT touch existing tables)

-- ============================================================
-- job_templates
-- ============================================================
create table if not exists public.job_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  description text,
  required_photo_count int not null default 0,
  allow_tech_send_invoice_warranty boolean not null default false,
  warranty_title text,
  warranty_body text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_templates enable row level security;

create policy "org_members_rw_job_templates" on public.job_templates for all
  using (org_id in (
    select org_id from public.org_members where user_id = auth.uid()
  ));

create index if not exists job_templates_org_id_idx on public.job_templates(org_id);

-- ============================================================
-- job_template_fields
-- ============================================================
create table if not exists public.job_template_fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  template_id uuid not null references public.job_templates(id) on delete cascade,
  label text not null,
  field_type text not null default 'short_text'
    check (field_type in ('short_text', 'dropdown', 'yes_no')),
  required boolean not null default false,
  sort_order int not null default 0,
  options jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_template_fields enable row level security;

create policy "org_members_rw_job_template_fields" on public.job_template_fields for all
  using (org_id in (
    select org_id from public.org_members where user_id = auth.uid()
  ));

create index if not exists job_template_fields_template_id_idx on public.job_template_fields(template_id);
create index if not exists job_template_fields_org_id_idx on public.job_template_fields(org_id);

-- ============================================================
-- job_template_invoice_items
-- ============================================================
create table if not exists public.job_template_invoice_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  template_id uuid not null references public.job_templates(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_template_invoice_items enable row level security;

create policy "org_members_rw_job_template_invoice_items" on public.job_template_invoice_items for all
  using (org_id in (
    select org_id from public.org_members where user_id = auth.uid()
  ));

create index if not exists job_template_invoice_items_template_id_idx on public.job_template_invoice_items(template_id);
create index if not exists job_template_invoice_items_org_id_idx on public.job_template_invoice_items(org_id);
