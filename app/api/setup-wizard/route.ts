import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient() as any;
  const body = await req.json();

  if (body.action === "skip") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("tb_wizard_skipped", "1", {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    return res;
  }

  const errors: string[] = [];

  if (body.business_name?.trim()) {
    const { error } = await admin
      .from("orgs")
      .update({ name: body.business_name.trim() })
      .eq("id", orgId!);
    if (error) errors.push(`Business name: ${error.message}`);
  }

  const settingsPayload: Record<string, unknown> = { org_id: orgId! };
  if (body.owner_name !== undefined) settingsPayload.owner_name = body.owner_name || null;
  if (body.phone !== undefined) settingsPayload.primary_phone = body.phone || null;
  if (body.city !== undefined) settingsPayload.city = body.city || null;
  if (body.state !== undefined) settingsPayload.state = body.state || null;
  if (body.service_area !== undefined) settingsPayload.service_area = body.service_area || null;
  if (body.payment_methods !== undefined) {
    settingsPayload.accepted_payment_methods = (body.payment_methods as string[]).join(",") || "cash";
  }
  if (body.payment_instructions !== undefined) {
    settingsPayload.payment_instructions = body.payment_instructions || null;
  }

  const { error: settingsErr } = await admin
    .from("org_settings")
    .upsert(settingsPayload, { onConflict: "org_id" });
  if (settingsErr) errors.push(`Settings: ${settingsErr.message}`);

  if (Array.isArray(body.presets) && body.presets.length > 0) {
    const rows = (body.presets as { name: string; price: number }[]).map(p => ({
      org_id: orgId!,
      service_name: p.name,
      flat_rate: p.price || 0,
      price_type: "flat",
      unit: "each",
      default_qty: 1,
      is_active: true,
      tags: [],
    }));
    const { error: presetsErr } = await admin.from("service_presets").insert(rows);
    if (presetsErr) errors.push(`Presets: ${presetsErr.message}`);
  }

  if (body.trade) {
    const slug = body.business_name
      ? body.business_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
      : orgId!.slice(0, 12);
    await admin.from("public_profiles").upsert(
      { org_id: orgId!, trade: body.trade, slug, is_published: false },
      { onConflict: "org_id" }
    );
  }

  if (errors.length > 0) console.error("[setup-wizard]", errors);
  return NextResponse.json({ ok: true, errors });
}
