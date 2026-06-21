import crypto from "crypto";

const TWILIO_BASE = "https://api.twilio.com/2010-04-01";

function getCredentials(): { accountSid: string; authToken: string } {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error(
      "Missing Twilio credentials. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to your Replit Secrets."
    );
  }
  return { accountSid, authToken };
}

function basicAuth(accountSid: string, authToken: string): string {
  return "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
}

async function twilioRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params?: Record<string, string>
): Promise<any> {
  const { accountSid, authToken } = getCredentials();
  let url = `${TWILIO_BASE}/Accounts/${accountSid}${path}`;

  const init: RequestInit = {
    method,
    headers: { Authorization: basicAuth(accountSid, authToken) },
  };

  if (method === "GET" && params) {
    const qs = new URLSearchParams(params).toString();
    url += "?" + qs;
  } else if (params) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(params).toString();
  }

  const res = await fetch(url, init);
  if (method === "DELETE") {
    if (res.status === 204 || res.status === 200) return null;
    const err = await res.json().catch(() => ({}));
    throw new Error(`Twilio ${res.status}: ${err.message ?? JSON.stringify(err)}`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}: ${data.message ?? data.code ?? JSON.stringify(data)}`);
  }
  return data;
}

export async function purchaseTwilioNumber(areaCode?: string): Promise<{
  sid: string;
  phoneNumber: string;
}> {
  const { accountSid, authToken } = getCredentials();
  const searchParams: Record<string, string> = { Limit: "1", VoiceEnabled: "true" };
  if (areaCode) searchParams.AreaCode = areaCode;

  const searchData = await twilioRequest(
    "GET",
    `/AvailablePhoneNumbers/US/Local.json`,
    searchParams
  );

  let candidate: string | null =
    searchData?.available_phone_numbers?.[0]?.phone_number ?? null;

  if (!candidate && areaCode) {
    const fallback = await twilioRequest("GET", `/AvailablePhoneNumbers/US/Local.json`, {
      Limit: "1",
      VoiceEnabled: "true",
    });
    candidate = fallback?.available_phone_numbers?.[0]?.phone_number ?? null;
  }

  if (!candidate) throw new Error("No available US phone numbers found in Twilio.");

  const purchased = await twilioRequest("POST", "/IncomingPhoneNumbers.json", {
    PhoneNumber: candidate,
  });

  return { sid: purchased.sid, phoneNumber: purchased.phone_number };
}

export async function setTwilioWebhooks(phoneSid: string, appBaseUrl: string): Promise<void> {
  await twilioRequest("POST", `/IncomingPhoneNumbers/${phoneSid}.json`, {
    VoiceUrl: `${appBaseUrl}/api/webhooks/twilio/voice`,
    VoiceMethod: "POST",
    StatusCallback: `${appBaseUrl}/api/webhooks/twilio/status`,
    StatusCallbackMethod: "POST",
  });
}

export async function releaseTwilioNumber(sid: string): Promise<void> {
  await twilioRequest("DELETE", `/IncomingPhoneNumbers/${sid}.json`);
}

export async function sendSms(to: string, from: string, body: string): Promise<void> {
  await twilioRequest("POST", "/Messages.json", { To: to, From: from, Body: body });
}

export function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  if (!signature) return false;
  const sortedKeys = Object.keys(params).sort();
  const base = url + sortedKeys.map((k) => k + params[k]).join("");
  const hmac = crypto.createHmac("sha1", authToken).update(base).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function getAppBaseUrl(): string {
  const url = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("APP_BASE_URL environment variable is not set.");
  return url.replace(/\/$/, "");
}

/** Build a TwiML response string for inbound call routing */
export function buildVoiceTwiml(opts: {
  routingMode: string;
  contractorNumber: string | null;
  retellAgentId: string | null;
  ringTimeout: number;
  recordCalls: boolean;
  appBaseUrl: string;
  callSid: string;
  orgId: string;
}): string {
  const { routingMode, contractorNumber, retellAgentId, ringTimeout, recordCalls, appBaseUrl, callSid, orgId } = opts;
  const record = recordCalls ? ` record="record-from-answer" recordingStatusCallback="${appBaseUrl}/api/webhooks/twilio/recording" recordingStatusCallbackMethod="POST"` : "";
  const dialStatusAction = `${appBaseUrl}/api/webhooks/twilio/dial-status?orgId=${encodeURIComponent(orgId)}&callSid=${encodeURIComponent(callSid)}`;

  if (routingMode === "ai_first") {
    if (!retellAgentId) return `<Response><Say>We're sorry, the AI receptionist is not configured yet. Please call back later.</Say><Hangup/></Response>`;
    return `<Response><Dial${record}><Sip>sip:${retellAgentId}@5t4n3q.sip.retellai.com</Sip></Dial></Response>`;
  }

  if (routingMode === "simultaneous") {
    const sipLeg = retellAgentId ? `<Sip>sip:${retellAgentId}@5t4n3q.sip.retellai.com</Sip>` : "";
    const numLeg = contractorNumber ? `<Number>${contractorNumber}</Number>` : "";
    if (!sipLeg && !numLeg) return `<Response><Say>No routing configured.</Say><Hangup/></Response>`;
    return `<Response><Dial timeout="${ringTimeout}"${record}>${numLeg}${sipLeg}</Dial></Response>`;
  }

  // contractor_first / ai_fallback: try contractor first, fall back to AI
  if (contractorNumber) {
    return `<Response><Dial timeout="${ringTimeout}" action="${dialStatusAction}" method="POST"${record}><Number>${contractorNumber}</Number></Dial></Response>`;
  }

  // No contractor number configured — go straight to AI
  if (retellAgentId) {
    return `<Response><Dial${record}><Sip>sip:${retellAgentId}@5t4n3q.sip.retellai.com</Sip></Dial></Response>`;
  }

  return `<Response><Say>We are unable to take your call right now. Please try again later.</Say><Hangup/></Response>`;
}

/** TwiML to connect the caller to Retell AI (used after contractor doesn't answer) */
export function buildRetellFallbackTwiml(retellAgentId: string, recordCalls: boolean, appBaseUrl: string): string {
  const record = recordCalls ? ` record="record-from-answer" recordingStatusCallback="${appBaseUrl}/api/webhooks/twilio/recording" recordingStatusCallbackMethod="POST"` : "";
  return `<Response><Dial${record}><Sip>sip:${retellAgentId}@5t4n3q.sip.retellai.com</Sip></Dial></Response>`;
}
