import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  // Confirm token belongs to this org
  const { data: pt } = await admin
    .from("customer_portal_tokens")
    .select("id,org_id")
    .eq("token", token)
    .eq("org_id", orgId!)
    .maybeSingle();

  if (!pt) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  // Try to set revoked_at (requires migration_portal_v2 to have been run)
  const { error: revokeErr } = await admin
    .from("customer_portal_tokens")
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("id", pt.id);

  if (revokeErr) {
    // Column may not exist yet — fall back to deleting the row
    await admin
      .from("customer_portal_tokens")
      .delete()
      .eq("id", pt.id);
  }

  return NextResponse.json({ ok: true });
}
