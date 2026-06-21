import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, verifyTwilioWebhook } from "@/lib/twilio";

export const dynamic = "force-dynamic";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
  const signature = req.headers.get("x-twilio-signature") ?? "";

  if (!verifyTwilioWebhook(req.url, params, signature)) {
    console.error("[Twilio status] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const callSid = params.CallSid ?? "";
  const callStatus = params.CallStatus ?? "";
  const callDuration = params.CallDuration ? parseInt(params.CallDuration, 10) : null;
  const fromNumber = params.From ?? params.Called ?? "";

  if (!callSid) return NextResponse.json({ received: true });

  const admin = createAdminClient();

  const { data: callLog } = await (admin as any)
    .from("call_logs")
    .select("id, org_id, answered_by, missed_call_sms_sent, from_number, to_number, customer_id, lead_id")
    .eq("twilio_call_sid", callSid)
    .maybeSingle();

  if (!callLog) return NextResponse.json({ received: true });

  const updatePayload: Record<string, unknown> = {
    status: callStatus,
    ended_at: new Date().toISOString(),
  };
  if (callDuration !== null) updatePayload.duration_seconds = callDuration;

  await (admin as any).from("call_logs").update(updatePayload).eq("id", callLog.id);

  const isMissed =
    (callStatus === "no-answer" || callStatus === "failed" || callStatus === "busy") &&
    !callLog.answered_by;

  // Missed-call SMS
  if (isMissed && !callLog.missed_call_sms_sent) {
    const caller = callLog.from_number || fromNumber;
    const { data: settings } = await (admin as any)
      .from("org_phone_settings")
      .select("missed_call_sms_enabled, missed_call_sms_template")
      .eq("org_id", callLog.org_id)
      .maybeSingle();

    if (settings?.missed_call_sms_enabled && caller && callLog.to_number) {
      const { data: org } = await (admin as any)
        .from("orgs")
        .select("name")
        .eq("id", callLog.org_id)
        .maybeSingle();

      const businessName = org?.name ?? "Your Contractor";
      const template: string =
        settings.missed_call_sms_template ||
        "Hi! You just called {business_name}. We missed you — we'll call you back shortly!";
      const smsBody = template.replace(/\{business_name\}/g, businessName);

      await sendSms(caller, callLog.to_number, smsBody).catch((e) =>
        console.error("[Twilio status] SMS send failed:", e)
      );
      await (admin as any).from("call_logs")
        .update({ missed_call_sms_sent: true })
        .eq("id", callLog.id);
    }
  }

  // Fallback lead creation for missed/unhandled inbound calls
  // Only create a lead when:
  // - call was missed (no-answer/failed/busy) or completed but never handled
  // - no customer_id and no lead_id already linked
  // - caller number is known
  // - this org has the phone addon active (or the number record exists)
  const shouldCreateLead =
    isMissed &&
    !callLog.customer_id &&
    !callLog.lead_id &&
    (callLog.from_number || fromNumber);

  if (shouldCreateLead) {
    const caller = callLog.from_number || fromNumber;
    const areaCode = normalizePhone(caller).slice(0, 3);
    const leadName = `Missed Call ${areaCode ? `(${areaCode})` : ""}`.trim();

    // Only create if no lead already exists for this number + org + last hour
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await (admin as any)
      .from("leads")
      .select("id")
      .eq("org_id", callLog.org_id)
      .eq("phone", caller)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const { data: newLead } = await (admin as any)
        .from("leads")
        .insert({
          org_id: callLog.org_id,
          name: leadName,
          phone: caller,
          status: "new",
          source: "phone_call",
          notes: "Missed call — no one available to answer.",
        })
        .select("id")
        .maybeSingle();

      if (newLead?.id) {
        await (admin as any)
          .from("call_logs")
          .update({ lead_id: newLead.id })
          .eq("id", callLog.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
