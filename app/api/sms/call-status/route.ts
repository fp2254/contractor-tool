/**
 * POST /api/sms/call-status
 * Twilio call status callback. Fires a missed-call SMS when org misses a call.
 * Configure in Twilio console: Voice → A Number → "Call status changes" → this URL.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioWebhook, sendSmsGraceful } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const text = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text));

  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!verifyTwilioWebhook(req.url, params, signature)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const callStatus = params.CallStatus ?? "";
  const callerNumber = params.From ?? "";
  const twilioNumber = params.To ?? "";

  // Only act on missed calls (no-answer or busy — not "failed" which is a network error)
  if (!["no-answer", "busy"].includes(callStatus)) {
    return NextResponse.json({ ok: true });
  }

  if (!callerNumber || !twilioNumber) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  // Look up org by the Twilio number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: phoneRow } = await (admin as any)
    .from("org_phone_numbers")
    .select("org_id")
    .eq("e164_number", twilioNumber)
    .eq("status", "active")
    .maybeSingle();

  if (!phoneRow?.org_id) return NextResponse.json({ ok: true });
  const orgId: string = phoneRow.org_id;

  // Check BOTH phone settings AND AI assistant config auto_reply
  const [{ data: phoneSetting }, { data: aiCfg }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("org_phone_settings")
      .select("missed_call_sms_enabled, missed_call_sms_template")
      .eq("org_id", orgId)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("org_ai_assistant_config")
      .select("enabled, auto_reply")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  // Both guards must pass: phone settings AND AI config auto_reply
  if (!phoneSetting?.missed_call_sms_enabled) return NextResponse.json({ ok: true });
  if (!aiCfg?.enabled || !aiCfg?.auto_reply) return NextResponse.json({ ok: true });

  // ── Idempotency guard: skip if SMS already sent for this CallSid ─────────────
  const callSid = params.CallSid ?? "";
  if (callSid) {
    const { data: existingLog } = await admin
      .from("call_logs")
      .select("missed_call_sms_sent")
      .eq("twilio_call_sid", callSid)
      .eq("org_id", orgId)
      .maybeSingle();
    if (existingLog?.missed_call_sms_sent) {
      return NextResponse.json({ ok: true, skipped: "already_sent" });
    }
  }

  // Check opt-out
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: optedOut } = await (admin as any)
    .from("opted_out_numbers")
    .select("id")
    .eq("org_id", orgId)
    .eq("phone_number", callerNumber)
    .maybeSingle();

  if (optedOut) return NextResponse.json({ ok: true });

  // Load business name for template substitution
  const [{ data: org }, { data: orgSettings }] = await Promise.all([
    admin.from("orgs").select("name").eq("id", orgId).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("org_settings").select("dba_name").eq("org_id", orgId).maybeSingle(),
  ]);
  const businessName = orgSettings?.dba_name || org?.name || "us";

  const template =
    phoneSetting.missed_call_sms_template ||
    `Hi! You just called {business_name}. Sorry we missed you — how can we help?`;
  const message = template.replace(/\{business_name\}/g, businessName);

  // Fire missed-call SMS
  const sent = await sendSmsGraceful(callerNumber, twilioNumber, message);

  if (sent) {
    // Update call_logs if there's a matching record (callSid already declared above)
    if (callSid) {
      await admin
        .from("call_logs")
        .update({ missed_call_sms_sent: true })
        .eq("twilio_call_sid", callSid)
        .eq("org_id", orgId);
    }

    // Log to sms_conversations/messages so it appears in any linked lead thread
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingConv } = await (admin as any)
      .from("sms_conversations")
      .select("id")
      .eq("org_id", orgId)
      .eq("from_number", callerNumber)
      .eq("status", "active")
      .maybeSingle();

    let convId: string | null = existingConv?.id ?? null;
    if (!convId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newConv } = await (admin as any)
        .from("sms_conversations")
        .insert({
          org_id: orgId,
          from_number: callerNumber,
          to_number: twilioNumber,
          status: "active",
        })
        .select("id")
        .single();
      convId = newConv?.id ?? null;
    }

    if (convId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("sms_messages").insert({
        conversation_id: convId,
        direction: "outbound",
        body: message,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
