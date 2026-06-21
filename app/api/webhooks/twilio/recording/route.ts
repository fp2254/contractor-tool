import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioWebhook } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
  const signature = req.headers.get("x-twilio-signature") ?? "";

  if (!verifyTwilioWebhook(req.url, params, signature)) {
    console.error("[Twilio recording] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const callSid = params.CallSid ?? "";
  const recordingSid = params.RecordingSid ?? "";
  const recordingUrl = params.RecordingUrl ?? "";
  const recordingStatus = params.RecordingStatus ?? "";

  if (!callSid || recordingStatus !== "completed") {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  await (admin as any)
    .from("call_logs")
    .update({
      recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
      recording_sid: recordingSid || null,
    })
    .eq("twilio_call_sid", callSid);

  return NextResponse.json({ received: true });
}
