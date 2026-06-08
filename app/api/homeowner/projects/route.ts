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
  const { data } = await a.from("homeowner_projects")
    .select("*")
    .eq("homeowner_id", homeownerId)
    .order("project_date", { ascending: false, nullsFirst: false });

  return NextResponse.json({ projects: data ?? [] });
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
  const { data, error } = await a.from("homeowner_projects").insert({
    homeowner_id: homeownerId,
    title: body.title.trim(),
    contractor_name: body.contractor_name?.trim() || null,
    description: body.description?.trim() || null,
    cost: body.cost ? parseFloat(body.cost) : null,
    project_date: body.project_date || null,
    completed_date: body.completed_date || body.project_date || null,
    rating: body.rating ? parseFloat(body.rating) : null,
    review_text: body.review_text?.trim() || null,
    has_warranty: !!body.has_warranty,
    has_documentation: !!body.has_documentation,
    photos: body.photos ?? [],
    status: body.status || "completed",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
