import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as Record<string, unknown>;

  const { error } = await admin
    .from("expenses")
    .update(body)
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { error } = await admin
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
