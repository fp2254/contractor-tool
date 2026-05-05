-- Phase 2: Connect Job Templates to Jobs
-- Run in Supabase SQL Editor (safe, additive – does NOT touch existing data)

-- ============================================================
-- 1. Add template_id to jobs (nullable, backwards compatible)
-- ============================================================
alter table public.jobs
  add column if not exists template_id uuid references public.job_templates(id) on delete set null;

create index if not exists jobs_template_id_idx on public.jobs(template_id);

-- ============================================================
-- 2. job_field_responses
-- ============================================================
create table if not exists public.job_field_responses (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs(id) on delete cascade,
  job_id        uuid not null references public.jobs(id) on delete cascade,
  template_id   uuid not null references public.job_templates(id) on delete cascade,
  field_id      uuid not null references public.job_template_fields(id) on delete cascade,
  value         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (job_id, field_id)
);

alter table public.job_field_responses enable row level security;

create policy "org_members_rw_job_field_responses" on public.job_field_responses for all
  using (org_id in (
    select org_id from public.org_members where user_id = auth.uid()
  ));

create index if not exists job_field_responses_job_id_idx on public.job_field_responses(job_id);
create index if not exists job_field_responses_org_id_idx on public.job_field_responses(org_id);
