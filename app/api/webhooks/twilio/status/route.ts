import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());

  const callSid = params.CallSid ?? "";
  const callStatus = params.CallStatus ?? "";
  const callDuration = params.CallDuration ? parseInt(params.CallDuration, 10) : null;
  const fromNumber = params.From ?? params.Called ?? "";

  if (!callSid) return NextResponse.json({ received: true });

  const admin = createAdminClient();

  // Find the call log
  const { data: callLog } = await (admin as any)
    .from("call_logs")
    .select("id, org_id, answered_by, missed_call_sms_sent, from_number, to_number")
    .eq("twilio_call_sid", callSid)
    .maybeSingle();

  if (!callLog) return NextResponse.json({ received: true });

  const updatePayload: Record<string, unknown> = {
    status: callStatus,
    ended_at: new Date().toISOString(),
  };
  if (callDuration !== null) updatePayload.duration_seconds = callDuration;

  await (admin as any).from("call_logs").update(updatePayload).eq("id", callLog.id);

  // Missed-call SMS logic
  const isMissed =
    (callStatus === "no-answer" || callStatus === "failed" || callStatus === "busy") &&
    !callLog.answered_by &&
    !callLog.missed_call_sms_sent;

  if (isMissed) {
    const caller = callLog.from_number || fromNumber;

    const { data: settings } = await (admin as any)
      .from("org_phone_settings")
      .select("missed_call_sms_enabled, missed_call_sms_template")
      .eq("org_id", callLog.org_id)
      .maybeSingle();

    if (settings?.missed_call_sms_enabled && caller) {
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

      const fromNum = callLog.to_number;
      if (fromNum) {
        await sendSms(caller, fromNum, smsBody).catch((e) =>
          console.error("[Twilio status] SMS send failed:", e)
        );
        await (admin as any).from("call_logs")
          .update({ missed_call_sms_sent: true })
          .eq("id", callLog.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
