import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildRetellFallbackTwiml, getAppBaseUrl, verifyTwilioWebhook } from "@/lib/twilio";

export const dynamic = "force-dynamic";

function twiml(xml: string) {
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
  const signature = req.headers.get("x-twilio-signature") ?? "";

  if (!verifyTwilioWebhook(req.url, params, signature)) {
    console.error("[Twilio dial-status] Invalid signature");
    return twiml("<Response><Reject/></Response>");
  }

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId") ?? "";
  const callSid = params.CallSid ?? url.searchParams.get("callSid") ?? "";
  const dialCallStatus = params.DialCallStatus ?? "";

  const admin = createAdminClient();

  if (dialCallStatus === "completed") {
    // Contractor answered — mark the call log
    (admin as any).from("call_logs")
      .update({ answered_by: "contractor" })
      .eq("twilio_call_sid", callSid)
      .then(() => {}).catch(() => {});

    return twiml("<Response></Response>");
  }

  // Contractor didn't answer — fall through to Retell AI
  if (orgId) {
    const [{ data: phoneRow }, { data: settings }] = await Promise.all([
      (admin as any).from("org_phone_numbers").select("retell_agent_id").eq("org_id", orgId).maybeSingle(),
      (admin as any).from("org_phone_settings").select("record_calls").eq("org_id", orgId).maybeSingle(),
    ]);

    const retellAgentId: string | null = phoneRow?.retell_agent_id ?? null;
    const recordCalls: boolean = settings?.record_calls !== false;

    // Note the routing fell back in the call log
    (admin as any).from("call_logs")
      .update({ routing_mode_used: "ai_fallback_triggered" })
      .eq("twilio_call_sid", callSid)
      .then(() => {}).catch(() => {});

    if (retellAgentId) {
      const appBase = (() => { try { return getAppBaseUrl(); } catch { return ""; } })();
      return twiml(buildRetellFallbackTwiml(retellAgentId, recordCalls, appBase));
    }
  }

  return twiml("<Response><Say>Sorry, we were unable to take your call. Please try again later.</Say><Hangup/></Response>");
}
