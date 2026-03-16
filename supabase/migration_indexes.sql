-- ============================================================
-- MISSING INDEXES — all business tables
-- Run once in Supabase SQL Editor
-- All use IF NOT EXISTS so safe to re-run
-- ============================================================

-- customers
CREATE INDEX IF NOT EXISTS customers_org_idx
  ON public.customers (org_id, created_at DESC);

-- quotes
CREATE INDEX IF NOT EXISTS quotes_org_idx
  ON public.quotes (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_customer_idx
  ON public.quotes (customer_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx
  ON public.quotes (status);

-- quote_items
CREATE INDEX IF NOT EXISTS quote_items_quote_idx
  ON public.quote_items (quote_id);
CREATE INDEX IF NOT EXISTS quote_items_org_idx
  ON public.quote_items (org_id);

-- jobs
CREATE INDEX IF NOT EXISTS jobs_org_idx
  ON public.jobs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_customer_idx
  ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx
  ON public.jobs (status);
CREATE INDEX IF NOT EXISTS jobs_scheduled_date_idx
  ON public.jobs (scheduled_date);
CREATE INDEX IF NOT EXISTS jobs_quote_idx
  ON public.jobs (quote_id);

-- invoices
CREATE INDEX IF NOT EXISTS invoices_org_idx
  ON public.invoices (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_customer_idx
  ON public.invoices (customer_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx
  ON public.invoices (status);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx
  ON public.invoices (due_date);
CREATE INDEX IF NOT EXISTS invoices_job_idx
  ON public.invoices (job_id);

-- invoice_items
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx
  ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_items_org_idx
  ON public.invoice_items (org_id);

-- notes
CREATE INDEX IF NOT EXISTS notes_org_entity_idx
  ON public.notes (org_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx
  ON public.notes (created_at DESC);

-- photos
CREATE INDEX IF NOT EXISTS photos_org_idx
  ON public.photos (org_id);
CREATE INDEX IF NOT EXISTS photos_job_idx
  ON public.photos (job_id);

-- expenses
CREATE INDEX IF NOT EXISTS expenses_org_idx
  ON public.expenses (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS expenses_job_idx
  ON public.expenses (job_id);

-- inventory_items
CREATE INDEX IF NOT EXISTS inventory_items_org_idx
  ON public.inventory_items (org_id, created_at DESC);

-- trade_contacts
CREATE INDEX IF NOT EXISTS trade_contacts_org_idx
  ON public.trade_contacts (org_id, created_at DESC);
