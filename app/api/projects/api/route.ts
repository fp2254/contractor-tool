import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function GET() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from("projects")
    .select("*")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json();
  const { data, error } = await (admin as any)
    .from("projects")
    .insert({
      org_id: orgId!,
      title: body.title ?? "",
      description: body.description ?? "",
      status: body.status ?? "completed",
      location: body.location ?? "",
      completed_at: body.completed_at || null,
      photos: body.photos ?? [],
      tags: body.tags ?? [],
      cost: body.cost ?? null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ project: data });
}
