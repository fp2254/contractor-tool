# TradeBase

Mobile-first PWA for tradespeople — leads, quotes, invoices, jobs, payments, and customer portal.

## Stack

- **Frontend/Backend**: Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Database**: Supabase (PostgreSQL) via `@supabase/ssr`
- **Auth**: Supabase Auth (SSR cookies)
- **Email**: Resend (via Replit integration) — quote/invoice/portal emails
- **PDF**: `@react-pdf/renderer` — branded quote and invoice PDFs
- **Storage**: Supabase Storage (`tradebase-photos` bucket) — job/customer photos
- **AI**: OpenAI via Replit AI Integrations (`gpt-5-mini`) — AI Job Capture feature
- **UI Theme**: Navy #1B3A6B header + white cards + gray-100 background

## Project Structure

```
app/
  app/              Authenticated contractor routes (guarded by ensureUserOrg)
    page.tsx        Dashboard
    leads/          Leads pipeline
    customers/      Customer profiles
    quotes/         Quote builder + detail
    jobs/           Job management
    invoices/       Invoice CRUD
    schedule/       Scheduling calendar
    money/          Payments overview
    more/           More menu
    trade-contacts/ Trade contacts (empty state)
    inventory/      Inventory (empty state)
  auth/             Login / signup
  portal/[token]/   Public customer portal (no auth — token-based)
  api/
    quotes/[id]/pdf       Download quote PDF (contractor)
    quotes/[id]/send      Email quote to customer
    invoices/[id]/pdf     Download invoice PDF (contractor)
    invoices/[id]/send    Email invoice to customer
    portal/generate       Generate + email customer portal link
    portal/[token]/quote/[quoteId]/pdf    Public quote PDF (portal)
    portal/[token]/invoice/[invoiceId]/pdf Public invoice PDF (portal)
    photos/upload, photos/[id]            Photo CRUD
    quotes/new/api        Create quote
components/
  AppShell.tsx          Nav shell (Home/Leads/Schedule/Jobs/Money/More)
  forms/QuoteBuilder.tsx  Quote builder with presets + inline new client
  PhotoGallery.tsx       Upload/view/delete photos
  SendEmailButton.tsx    Client button — send quote/invoice email
  SendPortalButton.tsx   Client button — send customer portal link
lib/
  auth.ts               ensureUserOrg() — org provisioning
  email.ts              Resend client + HTML email templates
  pdf/QuotePDF.tsx       Quote PDF template
  pdf/InvoicePDF.tsx     Invoice PDF template
  supabase/
    server.ts, client.ts, admin.ts, middleware.ts
  validation.ts         Zod schemas
supabase/
  migration_phase1.sql  ✅ applied
  migration_phase2.sql  ✅ applied
  migration_photos.sql  ✅ applied
  migration_portal.sql  ✅ applied
```

## Environment Variables

| Variable | Notes |
|---|---|
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | `https://lrtrbocvcqgfnklknlnu.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — used by admin client |
| `TB_POOL_URL` | Supabase connection pooler |

`next.config.ts` maps secrets to `NEXT_PUBLIC_*` and `DATABASE_URL` at runtime.

## Workflow

- **TradeBase**: `node scripts/start.js` → clears port 5000, then `next dev -H 0.0.0.0 -p 5000`

## Database

- Supabase project: `lrtrbocvcqgfnklknlnu`
- Admin client bypasses RLS for all data ops
- Org-based multi-tenancy: every row scoped to `org_id`
- Tables: orgs, org_members, org_settings, service_presets, customers, leads, quotes, quote_items, jobs, invoices, invoice_items, payments, notes, photos, customer_portal_tokens

## Features Complete

### Core CRM
- Leads pipeline (New/Contacted/Quoted/Scheduled/Won/Lost) with call/text/convert/note
- Customers with full history (quotes, jobs, invoices, notes, photos)
- Quote builder — line items, service preset chips, inline new client creation
- Jobs — status, scheduling, Maps navigation, photos, notes
- Invoices — mark paid with payment method, notes, photos
- Global search across all records
- Conversion flows: Lead→Customer, Lead→Quote, Quote→Job, Quote→Invoice, Job→Invoice

### Business Profile
- 8 settings sections: identity, defaults, service presets, payment methods, automation, export
- CSV export for customers, quotes, invoices

### PDFs
- Quote PDF (`/api/quotes/[id]/pdf`) — branded, line items, totals, tax
- Invoice PDF (`/api/invoices/[id]/pdf`) — branded, payment instructions, due date

### Scheduling Calendar
- Month/Week/Day views, colored status dots, tap to open, inline reschedule, Maps link

### Photo Attachments
- 3-column grid, fullscreen lightbox, delete on Jobs/Customers/Leads/Invoices
- Supabase Storage bucket `tradebase-photos`

### Email (Resend)
- Send Quote by email — generates PDF, sends branded HTML email with attachment
- Send Invoice by email — same for invoices
- Customer Portal link email — branded with big CTA button

### Customer Portal (`/portal/[token]`)
- Public, no login required — UUID token (30-day expiry)
- Customer sees all their quotes and invoices
- Accept / Decline open quotes directly from the portal
- Download PDF for any quote or invoice
- Branded with contractor's business name
- "Send Customer Portal Link" button on every customer detail page

## Not Yet Built
- Online payments (Stripe/Square)
- Recurring jobs
- Route optimization
- Team member roles / multi-user
- Offline mode (service worker)
