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

  await admin.storage.from("tradebase-photos").remove([photo.storage_path]);
  await admin.from("photos").delete().eq("id", id).eq("org_id", orgId!);

  return NextResponse.json({ success: true });
}
