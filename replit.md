# TradeBase

Mobile-first PWA for tradespeople — customers, quotes, invoices, jobs, and follow-ups.

## Stack

- **Frontend/Backend**: Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Database**: Supabase (PostgreSQL) via `@supabase/ssr` + Drizzle ORM
- **Auth**: Supabase Auth (SSR cookies)
- **ORM**: Drizzle ORM with `lib/db/schema.ts`

## Project Structure

```
app/                  Next.js App Router pages
  app/                Authenticated app routes (customers, jobs, quotes, invoices, followups)
  auth/               Auth routes (login, sign-up)
  globals.css         Global styles
  layout.tsx          Root layout
  page.tsx            Landing page
components/           Shared UI components
  AppShell.tsx        Main nav/layout wrapper
  forms/              Form components
  ui/                 Reusable UI primitives (Button, Card, Input, Modal)
lib/
  auth.ts             ensureUserOrg() — org provisioning on sign-in
  db/schema.ts        Drizzle schema definitions
  supabase/           Supabase client helpers (client, server, middleware)
  types.ts            Database type definitions
  validation.ts       Zod validation schemas
middleware.ts         Auth middleware (route protection)
drizzle/              SQL migration files
scripts/              Seed scripts
```

## Environment Variables

| Variable | Where | Notes |
|---|---|---|
| `SUPABASE_URL` | Shared env var | `https://lrtrbocvcqgfnklknlnu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_URL` | Shared env var | Same as SUPABASE_URL |
| `SUPABASE_ANON_KEY` | Secret | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Service role key |
| `TB_POOL_URL` | Secret | Supabase connection pooler URL (aws-0-us-west-2) |

`next.config.ts` maps `SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `TB_POOL_URL` → `DATABASE_URL` at build time.

## Workflow

- **TradeBase**: `npm run dev -- -H 0.0.0.0 -p 5000` (port 5000)

## Database

- Supabase project: `lrtrbocvcqgfnklknlnu`
- Connection: pooler URL via `TB_POOL_URL` secret (aws-0-us-west-2.pooler.supabase.com:5432)
- Schema managed via Drizzle ORM (`lib/db/schema.ts`)
- Run `npm run db:push` to sync schema changes

## Key Features

- Customer management
- Quote builder with line items
- Invoice tracking
- Job management
- Follow-ups
- Message templates
- Org-based multi-tenancy (orgs + org_members tables)
