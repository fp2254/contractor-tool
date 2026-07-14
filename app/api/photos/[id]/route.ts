import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("photos")
    .select("id,storage_path")
    .eq("id", id)
    .eq("org_id", orgId!)
    .single();

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Delete DB record FIRST — if it fails, storage is untouched.
  // A dangling storage file with no DB row is harmless; the reverse is not.
  const { error: dbError } = await admin
    .from("photos")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId!);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // DB row gone — now safe to remove from storage.
  await admin.storage.from("tradebase-photos").remove([photo.storage_path]);

  return NextResponse.json({ success: true });
}
