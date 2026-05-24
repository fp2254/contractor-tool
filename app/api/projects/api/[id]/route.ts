import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json();
  const { data, error } = await (admin as any)
    .from("projects")
    .update({
      title: body.title,
      description: body.description,
      status: body.status,
      location: body.location,
      completed_at: body.completed_at || null,
      photos: body.photos ?? [],
      tags: body.tags ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", orgId!)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ project: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId!);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
