---
name: Homeowner lead request system
description: Public lead submission form that auto-routes to matching contractors' pipelines — included in monthly subscription, no per-lead fees
---

## The idea
Homeowners submit a job request (trade, description, location, timeline, budget, contact info) from a public page. The system routes the lead to every active-subscription contractor who matches trade + geography. Lead auto-creates in their pipeline tagged "Source: TradeBase."

**The pitch to contractors:** "Every lead in your area, your trade — straight to your pipeline. No per-lead fees, ever." Directly counters Angi ($30–80/lead, shared with 3-5 contractors).

**Key decision needed:** Exclusive leads (first responder gets it) vs. shared leads (all matching contractors get homeowner's info). Shared is simpler to build; exclusive is a stronger selling point.

## What needs to be built
1. Public lead submission form — `/get-quotes` or extend `/find-contractors`
2. Geographic + trade matching logic (query active-subscription orgs by trade + distance)
3. Auto-create lead in each matching contractor's pipeline (Source: TradeBase Lead)
4. Email notification to contractor via Resend ("New lead in your area")
5. Basic spam/quality filter

## Prerequisites
- **Geocoding migration must run first** (`supabase/migration_geocoding.sql`) — adds lat/lng to org_settings, required for geographic matching
- Contractor profiles must be wired to real Supabase data (profile_slug on orgs)
- Active subscription check logic (only paying contractors receive leads)

## Why it works
Foundation is almost entirely there: leads table, customer pipeline, Resend emails, Supabase geo queries. Estimated 3–4 focused sessions once geocoding is live.
