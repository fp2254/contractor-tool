import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requirePlatformAdmin();
  const { id } = await params;
  const body = await req.json() as { action: "deactivate" | "reactivate" };
  const admin = createAdminClient();

  const banDuration = body.action === "deactivate" ? "876000h" : "none";
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: banDuration });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requirePlatformAdmin();
  const { id } = await params;
  const admin = createAdminClient();

  // 1. Delete all orgs this user owns — owner_user_id is NOT NULL so we must
  //    delete the org (and all its cascaded data) rather than nullify.
  const { data: ownedOrgs } = await (admin as any)
    .from("orgs")
    .select("id")
    .eq("owner_user_id", id);

  if (ownedOrgs && ownedOrgs.length > 0) {
    const orgIds = ownedOrgs.map((o: any) => o.id);
    await (admin as any).from("orgs").delete().in("id", orgIds);
  }

  // 2. Remove the user from any other orgs they're a member of (not owner)
  await (admin as any).from("org_members").delete().eq("user_id", id);

  // 3. Delete the auth record — FK constraint is now gone
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
