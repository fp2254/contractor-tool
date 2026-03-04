# TradeBase (SkippyStack)

Barebones mobile-first app for small trade contractors.

## Stack
- Next.js 15 App Router + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- Drizzle ORM (schema + migration tracking)
- Zod validation
- Playwright smoke test

## 1) Install
```bash
npm install
cp .env.example .env
```

## 2) Configure env vars
Set in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (Postgres URL, used by drizzle tooling)
- Optional E2E vars: `E2E_EMAIL`, `E2E_PASSWORD`

## 3) Supabase SQL migration
Run SQL from `drizzle/0000_tradebase.sql` in Supabase SQL editor.

This migration includes:
- Phase 1 core: customers, jobs, quotes, invoices, items
- Phase 2 revenue engine tables: `followups`, `message_templates`, activity events, extra quote/job lifecycle fields
- Future-ready tables for later phases: leads, payments, quote templates, ratings, intelligence events, contractor profiles, lead marketplace, permit rules
- Multi-tenant `orgs` + `org_members`
- RLS policies enforcing org-scoped access

## 4) Run app
```bash
npm run dev
```

Open http://localhost:3000

## Auth and tenancy behavior
- Sign up via `/auth/sign-up`
- Log in via `/auth/login`
- On first app entry, an org is auto-created and membership inserted as owner.
- `/app/*` routes are middleware protected.

## Seed helper
- Optional seed SQL in `scripts/seed.sql` and `scripts/seed_templates.sql`.

## Tests
Smoke test path: `e2e/smoke.spec.ts`

Run:
```bash
npm run test:e2e
```

If signup confirmation is enabled in Supabase, create a verified user once manually and set `E2E_EMAIL` / `E2E_PASSWORD`.
