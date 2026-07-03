---
name: Warranty stored as a prefixed note
description: How warranty text is stored/retrieved for quotes/invoices — not a dedicated column
---

Warranty text for a quote or invoice is stored in the generic `notes` table as a row whose `body` starts with `__warranty__:` (entity_type/entity_id scoped), not a dedicated column.

**Why:** Avoids a schema migration; reuses the existing notes table. But it means any new document type or PDF/email path must remember to explicitly fetch `notes` filtered by `.like("body", "__warranty__%")` and strip the prefix — it won't show up if you only select the entity's own columns.

**How to apply:** When adding warranty (or copying it between linked entities, e.g. quote → invoice) to a new send/PDF route, mirror the existing invoice routes: fetch the note, fall back to a linked entity's warranty note if the current one has none, strip `__warranty__:`, and pass `warrantyText` into both the PDF component and the email HTML template.
