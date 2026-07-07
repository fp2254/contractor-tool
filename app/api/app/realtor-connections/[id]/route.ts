import { NextRequest, NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json() as { status: "accepted" | "declined" };
  if (!["accepted", "declined"].includes(status)) {
    return NextResponse.json({ error: "status must be accepted or declined" }, { status: 400 });
  }

  const admin = createAdminClient() as any;

  const { error } = await admin
    .from("realtor_connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
