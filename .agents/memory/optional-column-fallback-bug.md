---
name: Optional-column fallback silent data loss
description: A retry-on-missing-column upsert pattern that strips a whole list of "optional" columns (instead of just the one causing the error) silently drops unrelated fields on every save.
---

When an upsert/insert handler catches a "column does not exist" error (Postgres `42703` or PostgREST `PGRST204`) and retries by removing a hardcoded list of "optional" columns, any column in that list gets silently dropped on **every** save that hits the fallback — not just the one column that's actually missing from the DB. This can make an unrelated, seemingly-correct feature (e.g. a template/theme picker) appear completely broken, because a totally different column (e.g. a photo gallery field) is the one missing a migration.

**Why:** discovered when a public-profile "selected template" setting never persisted. Root cause was a missing `photos` column, which triggered a fallback that stripped `selected_template`, `sections_config`, `trust_highlights`, and `custom_blocks` along with `photos` on every single save — none of those had anything to do with the missing column.

**How to apply:** when building this retry-on-missing-column pattern, parse the *specific* column name out of the DB error message and drop only that column before retrying (loop if multiple are missing). Never blanket-strip a static list of "optional" columns. When debugging a save that silently doesn't stick, check server logs for `PGRST204`/`42703` on an unrelated column before assuming the bug is in the specific feature being reported.
