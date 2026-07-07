import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealtorProfileByUserId } from "@/lib/realtor";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No realtor profile" }, { status: 404 });

  const admin = createAdminClient() as any;
  await admin.from("realtor_connections")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("realtor_profile_id", profile.id);

  return NextResponse.json({ ok: true });
}
