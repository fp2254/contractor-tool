import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = await req.json() as Record<string, string | null>;

  const businessName = (body.business_name ?? "").trim();
  if (businessName) {
    const { error: orgErr } = await admin
      .from("orgs")
      .update({ name: businessName })
      .eq("id", orgId!);
    if (orgErr) {
      console.error("[business-identity] orgs update error:", orgErr.message);
      return NextResponse.json({ error: `Could not save business name: ${orgErr.message}` }, { status: 400 });
    }
  }

  const settingsPayload: Record<string, string | null> = {
    org_id: orgId!,
    dba_name: body.dba_name || null,
    primary_phone: body.primary_phone || null,
    business_email: body.business_email || null,
    website: body.website || null,
    address: body.address || null,
    city: body.city || null,
    state: body.state || null,
    zip: body.zip || null,
    license_number: body.license_number || null,
    insurance_number: body.insurance_number || null,
    epa_cert_number: body.epa_cert_number || null,
    service_area: body.service_area || null,
    owner_name: body.owner_name || null,
    owner_title: body.owner_title || null,
    signature_footer: body.signature_footer || null,
  };
  if (body.logo_url !== undefined) {
    settingsPayload.logo_url = body.logo_url || null;
  }

  const { error: settingsErr } = await admin
    .from("org_settings")
    .upsert(settingsPayload, { onConflict: "org_id" });

  if (settingsErr) {
    console.error("[business-identity] org_settings upsert error:", settingsErr.message);
    return NextResponse.json({ error: `Could not save settings: ${settingsErr.message}` }, { status: 400 });
  }

  revalidatePath("/app/profile");
  return NextResponse.json({ success: true });
}
