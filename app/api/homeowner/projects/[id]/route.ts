import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getHomeownerId(userId: string) {
  const a = createAdminClient() as any;
  const { data } = await a.from("homeowner_profiles").select("id").eq("user_id", userId).single();
  return data?.id ?? null;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const homeownerId = await getHomeownerId(user.id);
  if (!homeownerId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { id } = await params;
  const a = createAdminClient() as any;
  await a.from("homeowner_projects").delete().eq("id", id).eq("homeowner_id", homeownerId);
  return NextResponse.json({ ok: true });
}
