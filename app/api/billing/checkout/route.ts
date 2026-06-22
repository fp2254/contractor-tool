import { NextRequest, NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/lemonsqueezy";
import { getAddonStatus, ADDON_DISPLAY_NAMES } from "@/lib/addons";
import { getAppBaseUrl } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const ADDON_SUCCESS_PATH: Record<string, string> = {
  phone_ai: "/app/phone",
  advanced_ai: "/app/advanced-ai",
};

export async function POST(req: NextRequest) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const addonType: string = body?.addonType ?? "phone_ai";

  if (!ADDON_DISPLAY_NAMES[addonType]) {
    return NextResponse.json({ error: `Unknown add-on type: ${addonType}` }, { status: 400 });
  }

  const addon = await getAddonStatus(orgId, addonType);
  if (addon.active) {
    return NextResponse.json({ error: `${ADDON_DISPLAY_NAMES[addonType]} is already active` }, { status: 409 });
  }

  const baseUrl = getAppBaseUrl();
  const successPath = ADDON_SUCCESS_PATH[addonType] ?? "/app/settings";
  const successUrl = `${baseUrl}${successPath}?activated=1`;
  const cancelUrl = `${baseUrl}${successPath}`;

  const checkoutUrl = await createCheckoutSession({
    orgId,
    userId: user.id,
    successUrl,
    cancelUrl,
    addonType,
  });

  return NextResponse.json({ checkoutUrl });
}
