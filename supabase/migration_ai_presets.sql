-- AI Presets Migration
-- Apply at: https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql

-- 1. Extend service_presets with new fields
alter table public.service_presets
  add column if not exists is_active boolean not null default true,
  add column if not exists unit text not null default 'each',
  add column if not exists default_qty numeric(10,2) not null default 1,
  add column if not exists tags text[] default '{}',
  add column if not exists category text;

-- 2. Add preset_id to quote_items (nullable — not all items come from presets)
alter table public.quote_items
  add column if not exists preset_id uuid references public.service_presets(id) on delete set null;

-- 3. Add preset_id to invoice_items
alter table public.invoice_items
  add column if not exists preset_id uuid references public.service_presets(id) on delete set null;
