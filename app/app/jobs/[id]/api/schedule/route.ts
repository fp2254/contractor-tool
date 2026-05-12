import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = await req.json() as {
    scheduled_date?: string;
    end_time?: string;
    address?: string;
    schedule_notes?: string;
  };

  if (!body.scheduled_date) {
    return NextResponse.json({ error: "scheduled_date is required" }, { status: 400 });
  }

  const update: Record<string, string | null> = {
    status: "scheduled",
    scheduled_date: body.scheduled_date,
  };
  if (body.address !== undefined) update.address = body.address || null;

  const { error } = await admin
    .from("jobs")
    .update(update)
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) {
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
