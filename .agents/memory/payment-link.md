---
name: Payment link feature
description: Deferred payment processing idea — contractor pastes their own payment link instead of integrating a processor
---

## The idea
Add a "Payment Link" field in org settings (business profile). Contractor pastes their Venmo, Zelle, PayPal, or Square link. Surface it on:
- Invoice detail page (contractor view)
- Customer portal (homeowner sees "Pay via Venmo → @mike-roofing")
- Invoice PDF footer

**Why:** User had a bad experience with Stripe holding funds. Doesn't want to touch payment processing for launch. This approach keeps TradeBase out of the money flow entirely — zero liability, zero processor risk.

**Why it works for trades:** Most contractors already use Venmo/Zelle/Square/cash. They don't need card processing, they need a record. Payment tracking (mark paid + method) is already built.

**Future:** Eventually integrate Square or Helcim (preferred over Stripe) for actual card processing. ACH/Dwolla good for large invoices (lower fees than card).

**How to apply:** When user is ready to build this, it's an org_settings column + display in invoice/portal views.
