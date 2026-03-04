create extension if not exists "pgcrypto";

-- enums
create type lead_status as enum ('new', 'contacted', 'quoted', 'scheduled', 'lost');
create type job_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type photo_tag as enum ('before', 'after', 'install', 'other');
create type quote_status as enum ('draft', 'sent', 'accepted', 'declined');
create type invoice_status as enum ('unpaid', 'paid', 'overdue');
create type payment_method as enum ('cash', 'check', 'card', 'ach');
create type entity_type as enum ('job', 'quote', 'invoice', 'payment', 'lead');
create type followup_status as enum ('pending', 'sent', 'skipped');
create type message_channel as enum ('sms', 'email');
create type lead_listing_status as enum ('open', 'sold', 'expired');

-- core crm + tenancy
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id),
  default_payment_terms_days integer not null default 14,
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text,
  last_name text,
  company_name text,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  notes text,
  created_by_user uuid references auth.users(id)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  lead_source text,
  status lead_status not null default 'new',
  notes text,
  converted_customer_id uuid references customers(id)
);

-- jobs + contractor memory
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  customer_id uuid not null references customers(id) on delete cascade,
  job_title text not null,
  service_type text,
  address text,
  city text,
  state text,
  zip text,
  scheduled_date date,
  start_time timestamptz,
  end_time timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  labor_minutes integer,
  labor_rate numeric(12,2),
  profit_estimate numeric(12,2),
  status job_status not null default 'scheduled',
  notes text,
  created_by_user uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  quote_id uuid,
  invoice_id uuid
);

create table if not exists job_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  job_id uuid not null references jobs(id) on delete cascade,
  photo_url text not null,
  tag photo_tag not null default 'other'
);

create table if not exists job_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  job_id uuid not null references jobs(id) on delete cascade,
  note text not null,
  created_by_user uuid references auth.users(id)
);

create table if not exists job_materials (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  job_id uuid not null references jobs(id) on delete cascade,
  material_name text not null,
  cost numeric(12,2),
  quantity numeric(12,2)
);

-- quotes + invoices
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  customer_id uuid not null references customers(id) on delete cascade,
  job_address text,
  city text,
  state text,
  zip text,
  status quote_status not null default 'draft',
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  invoice_id uuid,
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_by_user uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) not null
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  customer_id uuid not null references customers(id) on delete cascade,
  job_id uuid references jobs(id),
  invoice_number text,
  status invoice_status not null default 'unpaid',
  total_amount numeric(12,2) not null default 0,
  due_date timestamptz,
  created_by_user uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table quotes add constraint quotes_invoice_id_fkey foreign key (invoice_id) references invoices(id);
exception when duplicate_object then null; end $$;

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) not null
);

-- payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_method payment_method not null,
  paid_at timestamptz,
  notes text
);

-- automation
create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  name text not null,
  channel message_channel not null,
  subject text,
  body text not null,
  is_default boolean not null default false
);

create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  quote_id uuid not null references quotes(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  scheduled_for timestamptz not null,
  status followup_status not null default 'pending',
  channel message_channel not null,
  template_id uuid references message_templates(id),
  sent_at timestamptz,
  last_error text
);

-- intelligence + templates
create table if not exists quote_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  trade_type text,
  description text,
  scope_of_work text,
  created_by_user uuid references auth.users(id),
  is_public boolean not null default false,
  usage_count integer not null default 0
);

create table if not exists template_ratings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  template_id uuid not null references quote_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  rating integer not null check (rating between 1 and 5),
  unique(template_id, user_id)
);

create table if not exists quote_intelligence_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  trade_type text,
  region text,
  price numeric(12,2),
  labor_hours numeric(12,2),
  material_cost numeric(12,2)
);

-- contractor network
create table if not exists contractor_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id),
  company_name text,
  trade_type text,
  service_area text,
  phone text,
  email text,
  website text,
  license_number text,
  insurance_verified boolean not null default false,
  rating numeric(3,2)
);

-- marketplace
create table if not exists lead_exchange_listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  posted_by_user uuid references auth.users(id),
  job_type text,
  location text,
  budget_range text,
  lead_price numeric(12,2),
  status lead_listing_status not null default 'open',
  customer_contact text
);

-- premium features
create table if not exists permit_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  state text,
  city text,
  job_type text,
  permit_required boolean,
  permit_type text,
  permit_fee numeric(12,2),
  permit_url text
);


-- performance indexes (account_id maps to org_id in this schema)
create index if not exists customers_account_id_idx on customers(org_id);
create index if not exists jobs_account_id_idx on jobs(org_id);
create index if not exists jobs_customer_id_idx on jobs(customer_id);
create index if not exists quotes_account_id_idx on quotes(org_id);
create index if not exists invoices_account_id_idx on invoices(org_id);
create index if not exists followups_org_scheduled_for_idx on followups(org_id, scheduled_for);
create index if not exists followups_org_status_idx on followups(org_id, status);
create index if not exists quotes_org_status_idx on quotes(org_id, status);
create index if not exists quotes_org_sent_at_idx on quotes(org_id, sent_at);
create index if not exists jobs_org_completed_at_idx on jobs(org_id, completed_at);
create index if not exists job_materials_org_job_id_idx on job_materials(org_id, job_id);


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at before update on customers
for each row execute function public.set_updated_at();

create trigger jobs_set_updated_at before update on jobs
for each row execute function public.set_updated_at();

create trigger quotes_set_updated_at before update on quotes
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at before update on invoices
for each row execute function public.set_updated_at();

create trigger message_templates_set_updated_at before update on message_templates
for each row execute function public.set_updated_at();

create trigger followups_set_updated_at before update on followups
for each row execute function public.set_updated_at();

-- auditing
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id),
  entity_type entity_type not null,
  entity_id uuid,
  action text not null,
  description text
);

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

-- RLS
alter table orgs enable row level security;
alter table org_members enable row level security;

create policy "orgs_select" on orgs for select using (id in (select public.user_org_ids()));
create policy "orgs_insert" on orgs for insert with check (owner_user_id = auth.uid());
create policy "orgs_update" on orgs for update using (id in (select public.user_org_ids()));

create policy "org_members_rw" on org_members for all
using (org_id in (select public.user_org_ids()))
with check (org_id in (select public.user_org_ids()));

-- org_id-based RLS for all tenant tables
create or replace function public.enable_org_rls(_table regclass)
returns void
language plpgsql
as $$
begin
  execute format('alter table %s enable row level security', _table);
  execute format('create policy %I on %s for all using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()))',
    _table::text || '_org_policy', _table);
exception when duplicate_object then
  null;
end;
$$;

select public.enable_org_rls('customers');
select public.enable_org_rls('leads');
select public.enable_org_rls('jobs');
select public.enable_org_rls('job_photos');
select public.enable_org_rls('job_notes');
select public.enable_org_rls('job_materials');
select public.enable_org_rls('quotes');
select public.enable_org_rls('quote_items');
select public.enable_org_rls('invoices');
select public.enable_org_rls('invoice_items');
select public.enable_org_rls('payments');
select public.enable_org_rls('activity_log');
select public.enable_org_rls('followups');
select public.enable_org_rls('message_templates');
select public.enable_org_rls('quote_templates');
select public.enable_org_rls('template_ratings');
select public.enable_org_rls('quote_intelligence_events');
select public.enable_org_rls('contractor_profiles');
select public.enable_org_rls('lead_exchange_listings');
select public.enable_org_rls('permit_rules');
