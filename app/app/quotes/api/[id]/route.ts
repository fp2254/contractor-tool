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
  const body = await req.json() as { status?: string };

  const { error } = await admin
    .from("quotes")
    .update({ status: body.status ?? "archived" } as Record<string, unknown>)
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

  await admin.from("quote_items").delete().eq("quote_id", id);
  const { error } = await admin
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
