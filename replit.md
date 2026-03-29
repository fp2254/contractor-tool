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
    portal/[token]/quote/[quoteId]/pdf     Public quote PDF (portal)
    portal/[token]/invoice/[invoiceId]/pdf  Public invoice PDF (portal)
    portal/[token]/accept                   Accept quote with digital signature
    portal/[token]/revoke                   Revoke portal token
    photos/upload, photos/[id]              Photo CRUD
    quotes/new/api        Create quote (supports inline new customer)
    ai/capture, ai/permit, ai/create            AI features
    ai/job-brain, ai/scope, ai/followup         AI features
    ai/note-summary, ai/ops-summary             AI features
    ai/client-intel, ai/card-scan               AI features
    ai/receipt-scan, ai/price-sheet-scan        AI features
    ai/usage                                    AI usage status (used/limit/warning)
    ai/run/save, ai/attach, ai/attach/[id]      AI answer attachment CRUD
    entities/search                             Entity search for attach modal
    inventory/api, inventory/api/[id]           Inventory CRUD
    trade-contacts/api, trade-contacts/api/[id] Trade contacts CRUD
components/
  AppShell.tsx            Nav shell (Home/Leads/Schedule/Jobs/Money/More)
  forms/QuoteBuilder.tsx  Quote builder with presets + inline new client
  PhotoGallery.tsx        Upload/view/delete photos
  SendEmailButton.tsx     Client button — send quote/invoice email
  PortalLinkCard.tsx      Client component — send/revoke customer portal link on quote page
  SignatureCapture.tsx    Client component — canvas signature for portal quote acceptance
  PermitAssistant.tsx     AI permit lookup bottom sheet (saves run, attach to any entity)
  VoiceJobModal.tsx       Voice job creation 3-step modal
  EntityAiSection.tsx     AI answers panel on entity detail pages (jobs/leads/customers/quotes/invoices)
  AiAnswerCard.tsx        Renders AI output (permit, job capture, etc.)
  AiAttachModal.tsx       Bottom sheet to attach an AI run to any entity
  InventoryClient.tsx     Inventory list + inline create + qty adjust (app/app/inventory/)
  TradeContactsClient.tsx Trade contacts list + inline create (app/app/trade-contacts/)
lib/
  auth.ts               ensureUserOrg() — org provisioning
  email.ts              Resend client + HTML email templates
  openai.ts             OpenAI client via Replit AI Integrations
  pdf/QuotePDF.tsx       Quote PDF template
  pdf/InvoicePDF.tsx     Invoice PDF template
  supabase/
    server.ts, client.ts, admin.ts, middleware.ts
  validation.ts         Zod schemas
supabase/
  migration_phase1.sql       ✅ applied
  migration_phase2.sql       ✅ applied
  migration_photos.sql       ✅ applied
  migration_portal.sql       ✅ applied
  migration_portal_v2.sql          ⚠️ PENDING — run in Supabase SQL Editor (/app/setup)
  migration_ai_attachments.sql     ⚠️ PENDING — ai_runs + ai_attachments tables
  migration_inventory.sql          ⚠️ PENDING — inventory_items table
  migration_trade_contacts.sql     ⚠️ PENDING — trade_contacts table
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
- Public, no login required — UUID token (30-day expiry, revoke support after migration)
- Token stored in `customer_portal_tokens` (separate from quote IDs — unguessable)
- Customer sees all their quotes and invoices for that org
- Accept quotes with canvas digital signature — stored in `quote_signatures` table
- Decline quotes via server action
- Download PDF for any quote or invoice
- Branded with contractor's business name
- "Send Customer Portal Link" on every quote detail page (`PortalLinkCard`)
  - Reuses existing active token, or creates new one
  - Revoke button soft-deletes (sets revoked_at) or hard-deletes (pre-migration fallback)
  - "Resend" revokes old token and issues a fresh one
- Setup page at `/app/setup` shows migration SQL and live status checks

### AI Features
- **AI Job Capture**: natural language → structured job fields (with customer matching, preset lookup)
- **Voice Job Creation**: Web Speech API → AI extraction → create quote/job/invoice
- **Permit Assistant**: permit requirement lookup by job type + location
- **11 AI routes**: capture, permit, job-brain, scope, followup, note-summary, ops-summary, client-intel, card-scan, receipt-scan, price-sheet-scan
- All routes log to `ai_runs` table (feature, org_id, user_id, input, output)
- **AI Usage Limits** (`lib/ai/limits.ts`): 50 requests/day default, hard block at limit (429), soft warn at 80%
  - All 10 routes using `handleAIRequest` enforce limits automatically
  - Capture route has inline limit check before OpenAI call
  - `GET /api/ai/usage` returns current day/month usage for UI display
  - Per-org overrides via `org_ai_limits` table (billing hook) — see `scripts/ai-limits-setup.sql`
  - AI Capture Modal shows amber warning banner when approaching limit

## Not Yet Built
- Online payments (Stripe/Square)
- Recurring jobs
- Route optimization
- Team member roles / multi-user
- Offline mode (service worker)
