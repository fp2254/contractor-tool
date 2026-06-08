import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getHomeownerId(userId: string) {
  const a = createAdminClient() as any;
  const { data } = await a.from("homeowner_profiles").select("id").eq("user_id", userId).single();
  return data?.id ?? null;
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const homeownerId = await getHomeownerId(user.id);
  if (!homeownerId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { category, score_status, notes } = await req.json();
  if (!category || !score_status) return NextResponse.json({ error: "category and score_status required" }, { status: 400 });

  const a = createAdminClient() as any;
  await a.from("homeowner_scorecard").upsert({
    homeowner_id: homeownerId,
    category,
    score_status,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "homeowner_id,category" });

  return NextResponse.json({ ok: true });
}
