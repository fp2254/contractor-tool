import { NextRequest, NextResponse } from "next/server";
import { activateAddon, deactivateAddon, getAddonStatus } from "@/lib/addons";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoProvisionIfNeeded } from "@/lib/phone-provision";

export const dynamic = "force-dynamic";

/**
 * DEV-ONLY endpoint to simulate LemonSqueezy webhook events end-to-end.
 * Bypasses signature validation so you can test without real LS credentials.
 *
 * Only active when NODE_ENV !== "production".
 *
 * POST /api/webhooks/lemonsqueezy/test
 * Body: {
 *   event: "subscription_created" | "subscription_cancelled" | "subscription_expired",
 *   orgId: "<your-org-uuid>",
 *   addonType?: "phone_ai",
 *   subscriptionId?: "fake-sub-123",
 *   status?: "active" | "on_trial" | "past_due" | "cancelled" | "paused"
 * }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const {
    event = "subscription_created",
    orgId,
    addonType = "phone_ai",
    subscriptionId = `test-sub-${Date.now()}`,
    status: lsStatus = "active",
  } = body;

  console.log(`[LS webhook test] Simulating ${event} | org=${orgId} | sub=${subscriptionId} | status=${lsStatus}`);

  const admin = createAdminClient();

  switch (event) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed": {
      const ADDON_PRICES: Record<string, number> = { phone_ai: 29, advanced_ai: 19 };
      if (lsStatus === "active" || lsStatus === "on_trial") {
        await activateAddon(orgId, addonType, { priceMonthly: ADDON_PRICES[addonType] ?? 29 });

        const { error } = await (admin as any)
          .from("org_addons")
          .update({
            external_subscription_id: subscriptionId,
            billing_provider: "lemonsqueezy",
            status: lsStatus === "on_trial" ? "trialing" : "active",
          })
          .eq("org_id", orgId)
          .eq("addon_type", addonType);

        if (error) {
          console.error("[LS webhook test] update error:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        await autoProvisionIfNeeded(orgId).catch((e: Error) =>
          console.warn("[LS webhook test] auto-provision skipped:", e.message)
        );
      } else if (lsStatus === "past_due" || lsStatus === "unpaid") {
        await deactivateAddon(orgId, addonType, lsStatus as "past_due" | "unpaid");
        await (admin as any)
          .from("org_addons")
          .update({ external_subscription_id: subscriptionId, billing_provider: "lemonsqueezy" })
          .eq("org_id", orgId)
          .eq("addon_type", addonType);
      } else {
        await deactivateAddon(orgId, addonType, lsStatus === "paused" ? "paused" : "canceled");
        await (admin as any)
          .from("org_addons")
          .update({ external_subscription_id: subscriptionId, billing_provider: "lemonsqueezy" })
          .eq("org_id", orgId)
          .eq("addon_type", addonType);
      }
      break;
    }

    case "subscription_cancelled":
    case "subscription_expired": {
      await deactivateAddon(orgId, addonType, "canceled");
      await (admin as any)
        .from("org_addons")
        .update({ external_subscription_id: subscriptionId, billing_provider: "lemonsqueezy" })
        .eq("org_id", orgId)
        .eq("addon_type", addonType);
      break;
    }

    default:
      return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 });
  }

  const result = await getAddonStatus(orgId, addonType);

  return NextResponse.json({
    ok: true,
    simulated: { event, orgId, addonType, subscriptionId, lsStatus },
    addonStatus: result,
  });
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");
  const addonType = req.nextUrl.searchParams.get("addonType") ?? "phone_ai";

  if (!orgId) {
    return NextResponse.json({
      usage: "POST /api/webhooks/lemonsqueezy/test with { orgId, event?, addonType?, subscriptionId?, status? }",
      events: ["subscription_created", "subscription_updated", "subscription_resumed", "subscription_cancelled", "subscription_expired"],
      statuses: ["active", "on_trial", "past_due", "unpaid", "cancelled", "paused"],
    });
  }

  const { getAddonStatus } = await import("@/lib/addons");
  const result = await getAddonStatus(orgId, addonType);
  return NextResponse.json({ orgId, addonType, addonStatus: result });
}
