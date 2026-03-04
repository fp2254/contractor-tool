# TradeBase

Mobile-first PWA for tradespeople — leads, quotes, invoices, jobs, and follow-ups.

## Stack

- **Frontend/Backend**: Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Database**: Supabase (PostgreSQL) via `@supabase/ssr`
- **Auth**: Supabase Auth (SSR cookies)
- **UI Theme**: Dark navy blue (#1B3A6B) header + white cards + gray background

## Project Structure

```
app/                  Next.js App Router pages
  app/                Authenticated app routes
    page.tsx          Dashboard (stat cards, needs attention, quick actions)
    leads/            Leads list and detail
    jobs/             Jobs list and detail
    money/            Money / invoices overview
    more/             More menu (links to sub-pages)
    trade-contacts/   Trade contacts (static demo)
    inventory/        Inventory (static demo)
    reports/          Reports menu
    referral/         Referral program
    customers/        Customer management
    quotes/           Quote builder
    invoices/         Invoice CRUD
    followups/        Follow-up management
  auth/               Auth routes (login)
  globals.css         Global styles
  layout.tsx          Root layout
components/
  AppShell.tsx        Dark navy header + bottom nav (Home/Leads/Jobs/Money/More)
  ui/                 Reusable UI primitives (Button, Card, Input, Modal)
lib/
  auth.ts             ensureUserOrg() — org provisioning on sign-in (uses admin client)
  supabase/
    server.ts         Cookie-based Supabase client (server components)
    client.ts         Browser Supabase client
    admin.ts          Service-role admin client (bypasses RLS)
    middleware.ts     Session refresh middleware
  types.ts            Database type definitions
  validation.ts       Zod validation schemas
middleware.ts         Auth middleware (route protection)
```

## Environment Variables

| Variable | Where | Notes |
|---|---|---|
| `SUPABASE_URL` | Shared env var | `https://lrtrbocvcqgfnklknlnu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_URL` | Shared env var | Same as SUPABASE_URL |
| `SUPABASE_ANON_KEY` | Secret | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Service role key (used by admin client) |
| `TB_POOL_URL` | Secret | Supabase connection pooler URL |

`next.config.ts` maps `SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `TB_POOL_URL` → `DATABASE_URL` at runtime.

## Workflow

- **TradeBase**: `npm run dev -- -H 0.0.0.0 -p 5000` (port 5000)

## Database

- Supabase project: `lrtrbocvcqgfnklknlnu`
- All data operations use the service-role admin client to reliably bypass RLS
- Org-based multi-tenancy: every row scoped to `org_id`
- `ensureUserOrg()` in `lib/auth.ts` provisions org + org_member on first sign-in

## UI Design

- **Bottom navigation**: Home, Leads, Jobs, Money, More
- **Color**: Navy #1B3A6B header; gray-100 page bg; white cards
- **Stat cards** (dashboard): orange (New Leads), green (Jobs Today), red (Unpaid), blue (Estimates)
- **Quick Actions**: 2×2 grid of navy dark buttons
