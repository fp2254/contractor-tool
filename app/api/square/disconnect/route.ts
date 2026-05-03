import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  await (admin as any)
    .from("org_settings")
    .update({
      square_access_token: null,
      square_refresh_token: null,
      square_merchant_id: null,
      square_location_id: null,
      square_token_expires_at: null,
    })
    .eq("org_id", orgId);

  return NextResponse.json({ ok: true });
}
