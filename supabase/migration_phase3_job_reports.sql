-- Phase 3: Job Reports
-- Run in Supabase SQL Editor (safe, additive – does NOT touch existing data)

-- ============================================================
-- job_reports
-- ============================================================
create table if not exists public.job_reports (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs(id) on delete cascade,
  job_id           uuid not null references public.jobs(id) on delete cascade,
  template_id      uuid references public.job_templates(id) on delete set null,
  technician_id    uuid references auth.users(id),
  customer_id      uuid references public.customers(id) on delete set null,
  report_data      jsonb not null default '{}',
  generated_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.job_reports enable row level security;

create policy "org_members_rw_job_reports" on public.job_reports for all
  using (org_id in (
    select org_id from public.org_members where user_id = auth.uid()
  ));

create index if not exists job_reports_job_id_idx on public.job_reports(job_id);
create index if not exists job_reports_org_id_idx on public.job_reports(org_id);

-- Note: submitted_for_review is a new status value for jobs.status (text column).
-- No schema change needed – just start using it.
