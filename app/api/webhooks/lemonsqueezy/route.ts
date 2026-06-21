import { NextRequest, NextResponse } from "next/server";
import { validateLemonSqueezyWebhook, LsWebhookPayload } from "@/lib/lemonsqueezy";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateAddon, deactivateAddon } from "@/lib/addons";
import { autoProvisionIfNeeded } from "@/lib/phone-provision";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!validateLemonSqueezyWebhook(rawBody, signature)) {
    console.warn("[LemonSqueezy webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_name, custom_data } = payload.meta;
  const orgId = custom_data?.org_id;
  const addonType = custom_data?.addon_type ?? "phone_ai";
  const subscriptionId = payload.data?.id;
  const attributes = payload.data?.attributes;

  console.log(`[LemonSqueezy webhook] ${event_name} | org=${orgId} | sub=${subscriptionId}`);

  if (!orgId) {
    console.warn("[LemonSqueezy webhook] No org_id in custom_data — skipping");
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  switch (event_name) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed": {
      const lsStatus = attributes?.status;

      if (lsStatus === "active" || lsStatus === "on_trial") {
        await activateAddon(orgId, addonType, { priceMonthly: 29 });

        const periodEnd = attributes.renews_at ?? attributes.ends_at ?? null;
        await (admin as any)
          .from("org_addons")
          .update({
            external_subscription_id: subscriptionId ?? null,
            billing_provider: "lemonsqueezy",
            current_period_end: periodEnd,
            status: lsStatus === "on_trial" ? "trialing" : "active",
          })
          .eq("org_id", orgId)
          .eq("addon_type", addonType);

        await autoProvisionIfNeeded(orgId).catch((e: Error) =>
          console.error("[LemonSqueezy webhook] Auto-provision failed:", e.message)
        );
      } else if (lsStatus === "past_due" || lsStatus === "unpaid") {
        // Payment failed — deactivate access but preserve the exact failure status
        // so the admin dashboard can distinguish "needs payment" from "cancelled"
        await deactivateAddon(orgId, addonType, lsStatus);
        await (admin as any)
          .from("org_addons")
          .update({
            external_subscription_id: subscriptionId ?? null,
            billing_provider: "lemonsqueezy",
          })
          .eq("org_id", orgId)
          .eq("addon_type", addonType);
      } else if (lsStatus === "cancelled" || lsStatus === "expired" || lsStatus === "paused") {
        await deactivateAddon(
          orgId,
          addonType,
          lsStatus === "paused" ? "paused" : "canceled"
        );
        await (admin as any)
          .from("org_addons")
          .update({
            external_subscription_id: subscriptionId ?? null,
            billing_provider: "lemonsqueezy",
          })
          .eq("org_id", orgId)
          .eq("addon_type", addonType);
      }
      break;
    }

    case "subscription_cancelled":
    case "subscription_expired": {
      await deactivateAddon(orgId, addonType, "canceled");
      if (subscriptionId) {
        await (admin as any)
          .from("org_addons")
          .update({ external_subscription_id: subscriptionId, billing_provider: "lemonsqueezy" })
          .eq("org_id", orgId)
          .eq("addon_type", addonType);
      }
      break;
    }

    default:
      console.log(`[LemonSqueezy webhook] Unhandled event: ${event_name}`);
  }

  return NextResponse.json({ ok: true });
}
