---
name: Supabase migrations must run in Supabase Studio
description: executeSql hits a local Replit Postgres, NOT the app's Supabase DB — verify columns via Supabase REST before trusting "applied"
---

The app's data lives in Supabase (project lrtrbocvcqgfnklknlnu), accessed via supabase-js REST with the service role key. The `executeSql` sandbox tool targets a different, local Replit Postgres database — DDL run there succeeds but changes nothing in the real app DB.

**Why:** A "page_text" migration (July 2026) appeared applied via executeSql, but the Supabase table was unchanged; earlier "applied" markers in replit.md (about_photo, public_profile_photos) were also wrong for the same reason. Direct DB connections fail: `SUPABASE_DB_URL` host is unreachable (IPv6-only) and `TB_POOL_URL` password authentication fails.

**How to apply:** Schema changes go in `supabase/migration_*.sql` and must be run by the user in Supabase Studio SQL Editor. To verify whether a column truly exists, query the Supabase REST API with the service role key (`GET /rest/v1/<table>?select=<col>&limit=1` — 400/42703 means missing). The public-profile save route strips missing columns on PGRST204/42703, so unapplied migrations fail silently on save.
