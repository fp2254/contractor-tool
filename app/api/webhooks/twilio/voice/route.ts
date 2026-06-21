import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTwilioSignature, buildVoiceTwiml, getAppBaseUrl } from "@/lib/twilio";

export const dynamic = "force-dynamic";

function twiml(xml: string) {
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const isDev = process.env.NODE_ENV !== "production";

  if (authToken && signature) {
    try {
      const appBase = getAppBaseUrl();
      const valid = validateTwilioSignature(authToken, `${appBase}/api/webhooks/twilio/voice`, params, signature);
      if (!valid && !isDev) {
        return twiml("<Response><Reject/></Response>");
      }
    } catch {
      // APP_BASE_URL not set — skip validation in dev
    }
  }

  const toNumber = params.To ?? "";
  const fromNumber = params.From ?? "";
  const callSid = params.CallSid ?? "";

  if (!toNumber || !callSid) {
    return twiml("<Response><Hangup/></Response>");
  }

  const admin = createAdminClient();

  // Look up org by the Twilio number
  const { data: phoneRow } = await (admin as any)
    .from("org_phone_numbers")
    .select("org_id, retell_agent_id")
    .eq("e164_number", toNumber)
    .maybeSingle();

  if (!phoneRow) {
    return twiml("<Response><Say>This number is not configured.</Say><Hangup/></Response>");
  }

  const orgId: string = phoneRow.org_id;
  const retellAgentId: string | null = phoneRow.retell_agent_id ?? null;

  // Get phone settings
  const { data: settings } = await (admin as any)
    .from("org_phone_settings")
    .select("routing_mode,contractor_forward_number,ring_timeout_seconds,record_calls")
    .eq("org_id", orgId)
    .maybeSingle();

  const routingMode: string = settings?.routing_mode ?? "ai_fallback";
  const contractorNumber: string | null = settings?.contractor_forward_number ?? null;
  const ringTimeout: number = settings?.ring_timeout_seconds ?? 20;
  const recordCalls: boolean = settings?.record_calls !== false;

  // Try to match caller to existing customer
  const normalizedFrom = normalizePhone(fromNumber);
  let customerId: string | null = null;
  if (normalizedFrom.length >= 10) {
    const { data: customer } = await (admin as any)
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .ilike("phone", `%${normalizedFrom.slice(-10)}%`)
      .limit(1)
      .maybeSingle();
    customerId = customer?.id ?? null;
  }

  // Insert call log (fire and forget — don't block TwiML response)
  const appBase = (() => { try { return getAppBaseUrl(); } catch { return ""; } })();

  (admin as any).from("call_logs").insert({
    org_id: orgId,
    twilio_call_sid: callSid,
    direction: "inbound",
    from_number: fromNumber,
    to_number: toNumber,
    status: "in_progress",
    routing_mode_used: routingMode,
    customer_id: customerId,
    started_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {});

  const xml = buildVoiceTwiml({
    routingMode,
    contractorNumber,
    retellAgentId,
    ringTimeout,
    recordCalls,
    appBaseUrl: appBase,
    callSid,
    orgId,
  });

  return twiml(xml);
}
