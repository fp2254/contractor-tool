import { NextRequest, NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAddonStatus, addonNotActiveResponse } from "@/lib/addons";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addon = await getAddonStatus(orgId, "phone_ai");
  if (!addon.active) return addonNotActiveResponse("phone_ai");

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") ?? "all";
  const cursor = url.searchParams.get("cursor");
  const limit = 30;

  const admin = createAdminClient();

  let query = (admin as any)
    .from("call_logs")
    .select(
      `id, direction, from_number, to_number, status, duration_seconds,
       recording_url, caller_name, answered_by, routing_mode_used,
       missed_call_sms_sent, started_at, ended_at,
       customer_id, lead_id,
       call_transcripts(ai_summary, sentiment)`
    )
    .eq("org_id", orgId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (filter === "missed") {
    query = query.is("answered_by", null).eq("direction", "inbound");
  } else if (filter === "answered") {
    query = query.not("answered_by", "is", null);
  }

  if (cursor) {
    query = query.lt("started_at", cursor);
  }

  const { data: calls, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load calls" }, { status: 500 });

  const nextCursor =
    calls && calls.length === limit ? calls[calls.length - 1].started_at : null;

  return NextResponse.json({ calls: calls ?? [], nextCursor });
}
