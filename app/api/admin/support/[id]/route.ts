import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["open", "in_progress", "closed"]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
  }

  let body: { status?: unknown; priority?: unknown };
  try {
    body = await req.json() as { status?: unknown; priority?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, string> = {};

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid ticket status" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.priority !== undefined) {
    if (typeof body.priority !== "string" || !ALLOWED_PRIORITIES.has(body.priority)) {
      return NextResponse.json({ error: "Invalid ticket priority" }, { status: 400 });
    }
    update.priority = body.priority;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ticket, error } = await (admin as any)
    .from("support_tickets")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/support] update error:", error.message);
    return NextResponse.json({ error: "Failed to update support ticket" }, { status: 500 });
  }

  if (!ticket) {
    return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
