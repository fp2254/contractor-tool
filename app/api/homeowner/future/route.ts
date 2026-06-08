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
  const { data } = await a.from("homeowner_future_projects")
    .select("*").eq("homeowner_id", homeownerId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const homeownerId = await getHomeownerId(user.id);
  if (!homeownerId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const a = createAdminClient() as any;
  const { data, error } = await a.from("homeowner_future_projects").insert({
    homeowner_id: homeownerId,
    title: body.title.trim(),
    status: body.status || "planning",
    notes: body.notes?.trim() || null,
    cover_image_url: body.cover_image_url || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const homeownerId = await getHomeownerId(user.id);
  if (!homeownerId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { id } = await req.json();
  const a = createAdminClient() as any;
  await a.from("homeowner_future_projects").delete().eq("id", id).eq("homeowner_id", homeownerId);
  return NextResponse.json({ ok: true });
}
