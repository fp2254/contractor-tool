import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getHomeownerId(userId: string) {
  const a = createAdminClient() as any;
  const { data } = await a.from("homeowner_profiles").select("id").eq("user_id", userId).single();
  return data?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const homeownerId = await getHomeownerId(user.id);
  if (!homeownerId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const a = createAdminClient() as any;
  const { data } = await a.from("homeowner_profiles")
    .select("display_name,avatar_url,banner_url,location,is_profile_public")
    .eq("id", homeownerId).single();

  return NextResponse.json({ settings: data });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const homeownerId = await getHomeownerId(user.id);
  if (!homeownerId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const a = createAdminClient() as any;

  await a.from("homeowner_profiles").update({
    display_name: body.display_name?.trim() || undefined,
    location: body.location?.trim() || null,
    is_profile_public: typeof body.is_profile_public === "boolean" ? body.is_profile_public : undefined,
    updated_at: new Date().toISOString(),
  }).eq("id", homeownerId);

  return NextResponse.json({ ok: true });
}
