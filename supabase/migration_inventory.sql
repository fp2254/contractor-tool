-- Migration: Inventory
-- Run in Supabase SQL Editor

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  sku text,
  description text,
  quantity integer not null default 0,
  unit_cost numeric(10,2) not null default 0,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_items_org_id_idx on inventory_items(org_id);

alter table inventory_items enable row level security;

create policy "org members can manage inventory"
  on inventory_items for all
  using (org_id in (select org_id from org_members where user_id = auth.uid()));
