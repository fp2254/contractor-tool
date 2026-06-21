import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/lemonsqueezy";
import { getAddonStatus } from "@/lib/addons";
import { getAppBaseUrl } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function POST() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addon = await getAddonStatus(orgId, "phone_ai");
  if (addon.active) {
    return NextResponse.json({ error: "Phone add-on is already active" }, { status: 409 });
  }

  const baseUrl = getAppBaseUrl();
  const successUrl = `${baseUrl}/app/phone?activated=1`;
  const cancelUrl = `${baseUrl}/app/phone`;

  const checkoutUrl = await createCheckoutSession({
    orgId,
    userId: user.id,
    successUrl,
    cancelUrl,
  });

  return NextResponse.json({ checkoutUrl });
}
