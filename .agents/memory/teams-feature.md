---
name: Teams Feature
description: Assignment-based multi-member access control for jobs, quotes, invoices
---

## Design

- **Members** see ONLY records where `assigned_to = their user_id`
- **Admins/Owners** see ALL records, with assignee name badges shown
- Assignment is optional — unassigned records are visible to admins only

## Key columns added

`assigned_to uuid REFERENCES auth.users(id)` on: `jobs`, `quotes`, `invoices`

Migration: `supabase/migration_team_assignments.sql` — must be run manually in Supabase Studio

## Pattern for list pages

```typescript
const { role, userId } = await getUserOrgRole();
const isMember = !isOwnerOrAdmin(role);
if (isMember && userId) {
  query = query.eq("assigned_to", userId);
}
```

## Assignment endpoint

`PATCH /api/team/assign` — body: `{ entityType, entityId, assignedTo }` — admin only

## AssigneeField component

`components/AssigneeField.tsx` — client component, calls PATCH /api/team/assign on change
Shows dropdown for admins, read-only label for members

**Why:** Members need scoped access; admins need to see and reassign everything
**How to apply:** All new entity list/detail pages should follow this same pattern
