import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateRetellWebhook } from "@/lib/retell";

export const dynamic = "force-dynamic";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!validateRetellWebhook(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId") ?? "";

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event ?? payload.event_type;
  const callData = payload.call ?? payload;

  if (event !== "call_ended" && event !== "call_analyzed" && !callData.call_id) {
    return NextResponse.json({ received: true });
  }

  const retellCallId: string = callData.call_id ?? callData.retell_call_id ?? "";
  const fromNumber: string = callData.from_number ?? callData.caller_number ?? "";
  const callerName: string = callData.call_analysis?.agent_task_completion_data?.caller_name ?? "";
  const transcript = callData.transcript_object ?? callData.transcript ?? null;
  const aiSummary: string = callData.call_analysis?.call_summary ?? "";
  const sentiment: string = callData.call_analysis?.user_sentiment ?? "";

  const admin = createAdminClient();

  // Find the matching call_log
  let callLogId: string | null = null;
  let callLogOrgId: string = orgId;

  if (retellCallId) {
    const { data: byRetell } = await (admin as any)
      .from("call_logs")
      .select("id, org_id, customer_id, lead_id, from_number")
      .eq("retell_call_id", retellCallId)
      .maybeSingle();

    if (byRetell) {
      callLogId = byRetell.id;
      callLogOrgId = byRetell.org_id;
    }
  }

  // Fallback: match by org + from_number + recent started_at
  if (!callLogId && orgId && fromNumber) {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: byPhone } = await (admin as any)
      .from("call_logs")
      .select("id, org_id, customer_id, lead_id, from_number")
      .eq("org_id", orgId)
      .eq("from_number", fromNumber)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byPhone) {
      callLogId = byPhone.id;
      callLogOrgId = byPhone.org_id;
    }
  }

  if (callLogId) {
    // Update call_log
    await (admin as any).from("call_logs").update({
      answered_by: "retell",
      retell_call_id: retellCallId || null,
      caller_name: callerName || null,
    }).eq("id", callLogId);

    // Upsert transcript
    if (transcript || aiSummary) {
      await (admin as any).from("call_transcripts").upsert({
        call_log_id: callLogId,
        org_id: callLogOrgId,
        transcript: transcript ?? null,
        ai_summary: aiSummary || null,
        sentiment: sentiment || null,
      }, { onConflict: "call_log_id" });
    }

    // Check if lead needs to be created
    const { data: callLog } = await (admin as any)
      .from("call_logs")
      .select("customer_id, lead_id, from_number")
      .eq("id", callLogId)
      .maybeSingle();

    if (callLog && !callLog.customer_id && !callLog.lead_id && callLog.from_number) {
      const areaCode = normalizePhone(callLog.from_number).slice(0, 3);
      const leadName = callerName || `Caller (${areaCode})`;

      const { data: newLead } = await (admin as any).from("leads").insert({
        org_id: callLogOrgId,
        name: leadName,
        phone: callLog.from_number,
        status: "new",
        source: "phone_call",
        notes: aiSummary ? `AI Summary: ${aiSummary}` : null,
      }).select("id").maybeSingle();

      if (newLead?.id) {
        await (admin as any).from("call_logs")
          .update({ lead_id: newLead.id })
          .eq("id", callLogId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
