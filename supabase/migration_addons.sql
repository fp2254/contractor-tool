-- Add-on subscriptions table (generic, supports any future add-on type)
create table if not exists org_addons (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  addon_type        text not null,
  status            text not null default 'active'
                      check (status in ('active', 'trialing', 'canceled', 'paused')),
  price_monthly     numeric(10,2),
  activated_at      timestamptz default now(),
  current_period_end timestamptz,
  notes             text,
  created_at        timestamptz default now(),
  unique (org_id, addon_type)
);

alter table org_addons enable row level security;

-- Org members can read their own add-on rows; no user writes (service role only)
create policy "org_addons_select"
  on org_addons for select
  using (
    org_id in (
      select om.org_id from org_members om where om.user_id = auth.uid()
    )
  );
