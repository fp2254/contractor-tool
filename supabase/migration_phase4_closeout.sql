-- Phase 4: Job Closeout Packages
-- Run in Supabase SQL Editor (safe, additive)

create table if not exists public.job_closeout_packages (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs(id) on delete cascade,
  job_id           uuid not null references public.jobs(id) on delete cascade,
  report_id        uuid references public.job_reports(id) on delete set null,
  invoice_id       uuid references public.invoices(id) on delete set null,
  warranty_title   text,
  warranty_body    text,
  package_data     jsonb not null default '{}',
  status           text not null default 'draft' check (status in ('draft', 'sent')),
  sent_by          uuid references auth.users(id),
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.job_closeout_packages enable row level security;

create policy "org_members_rw_closeout_packages" on public.job_closeout_packages for all
  using (org_id in (
    select org_id from public.org_members where user_id = auth.uid()
  ));

create index if not exists closeout_packages_job_id_idx on public.job_closeout_packages(job_id);
create index if not exists closeout_packages_org_id_idx on public.job_closeout_packages(org_id);
