import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { getAddonStatus } from "@/lib/addons";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addon = await getAddonStatus(orgId, "phone_ai");
  if (!addon.externalSubscriptionId) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  try {
    const portalUrl = await getCustomerPortalUrl(addon.externalSubscriptionId);
    return NextResponse.json({ portalUrl });
  } catch (err: any) {
    console.error("[billing/portal-url]", err);
    return NextResponse.json({ error: err.message ?? "Failed to get billing portal URL" }, { status: 500 });
  }
}
