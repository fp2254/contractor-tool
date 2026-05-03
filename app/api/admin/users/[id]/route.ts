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

  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: banDuration,
  });

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

  // 1. Find orgs this user owns and nullify owner_user_id to drop the FK
  const { data: ownedOrgs } = await (admin as any)
    .from("orgs")
    .select("id")
    .eq("owner_user_id", id);

  if (ownedOrgs && ownedOrgs.length > 0) {
    await (admin as any)
      .from("orgs")
      .update({ owner_user_id: null })
      .eq("owner_user_id", id);
  }

  // 2. Remove the user from org_members
  await (admin as any).from("org_members").delete().eq("user_id", id);

  // 3. Nullify created_by_user across all tables that track it
  const tablesWithCreator = [
    "quotes", "quote_items", "jobs", "invoices", "invoice_items",
    "leads", "customers", "notes", "message_templates",
  ];
  await Promise.all(
    tablesWithCreator.map((table) =>
      (admin as any).from(table).update({ created_by_user: null }).eq("created_by_user", id)
    )
  );

  // 4. Now delete the auth user
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
