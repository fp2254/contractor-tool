import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json();
  const newDate: string = body.scheduled_date;

  if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const { error } = await admin
    .from("jobs")
    .update({ scheduled_date: newDate })
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
