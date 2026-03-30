import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const body = await req.json() as { status?: string; priority?: string };
  const admin = createAdminClient();

  const update: Record<string, string> = {};
  if (body.status) update.status = body.status;
  if (body.priority) update.priority = body.priority;

  const { error } = await (admin as any)
    .from("support_tickets")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
