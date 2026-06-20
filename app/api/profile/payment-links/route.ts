import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await (admin as any)
    .from("org_settings")
    .select("payment_links")
    .eq("org_id", orgId)
    .maybeSingle();

  return NextResponse.json({ payment_links: data?.payment_links ?? {} });
}

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { venmo, cashapp, paypal, zelle, custom_label, custom_url } = body;

  const payment_links: Record<string, string> = {};
  if (venmo?.trim())        payment_links.venmo        = venmo.trim();
  if (cashapp?.trim())      payment_links.cashapp      = cashapp.trim();
  if (paypal?.trim())       payment_links.paypal       = paypal.trim();
  if (zelle?.trim())        payment_links.zelle        = zelle.trim();
  if (custom_label?.trim()) payment_links.custom_label = custom_label.trim();
  if (custom_url?.trim())   payment_links.custom_url   = custom_url.trim();

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("org_settings")
    .upsert({ org_id: orgId, payment_links }, { onConflict: "org_id" });

  if (error) {
    console.error("[payment-links] upsert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/app/settings");
  return NextResponse.json({ success: true, payment_links });
}
