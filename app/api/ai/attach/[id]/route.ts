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

  const body = await req.json() as {
    title?: string | null;
    note?: string | null;
    is_pinned?: boolean;
  };

  const { error } = await admin
    .from("ai_attachments" as "orgs")
    .update(body as never)
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
    .from("ai_attachments" as "orgs")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
