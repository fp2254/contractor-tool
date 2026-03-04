# TradeBase Agent Guide

## Project purpose
TradeBase (SkippyStack) is a simple, mobile-first web app for small trade contractors to manage customers, quotes, invoices, and jobs with Supabase auth and multi-tenant data security.

## Commands
- `npm run dev` - start local app
- `npm run lint` - run lint checks
- `npm test` - run smoke Playwright suite
- `npm run test:e2e` - run all Playwright tests

## Coding conventions
- Keep UI minimal and tap-friendly (large controls, clear labels).
- Use TypeScript in strict mode.
- Validate user input with Zod before writes.
- Scope all data reads/writes by `org_id` and rely on Supabase RLS.
- Prefer small reusable UI components in `components/ui`.
