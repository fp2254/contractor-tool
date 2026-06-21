import { NextRequest, NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAddonStatus, addonNotActiveResponse } from "@/lib/addons";
import { purchaseTwilioNumber, setTwilioWebhooks, releaseTwilioNumber, getAppBaseUrl } from "@/lib/twilio";
import { createRetellAgent, createRetellLlm, deleteRetellAgent, deleteRetellLlm } from "@/lib/retell";

export const dynamic = "force-dynamic";

/** GET — return this org's current phone number */
export async function GET() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addon = await getAddonStatus(orgId, "phone_ai");
  if (!addon.active) return addonNotActiveResponse("phone_ai");

  const admin = createAdminClient();
  const { data } = await (admin as any)
    .from("org_phone_numbers")
    .select("id,e164_number,status,retell_agent_id,created_at")
    .eq("org_id", orgId)
    .maybeSingle();

  return NextResponse.json({ phoneNumber: data ?? null });
}

/** POST — provision a new Twilio number and Retell agent for this org */
export async function POST(req: NextRequest) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addon = await getAddonStatus(orgId, "phone_ai");
  if (!addon.active) return addonNotActiveResponse("phone_ai");

  const admin = createAdminClient();

  // Check if already provisioned
  const { data: existing } = await (admin as any)
    .from("org_phone_numbers")
    .select("id,e164_number")
    .eq("org_id", orgId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Phone number already provisioned", phoneNumber: existing }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const areaCode: string | undefined = body.areaCode || undefined;

  // Get org name for Retell agent
  const { data: org } = await admin.from("orgs").select("name").eq("id", orgId).single();
  const businessName = (org as any)?.name ?? "Your Business";

  const appBaseUrl = getAppBaseUrl();
  const retellWebhookUrl = `${appBaseUrl}/api/webhooks/retell/transcript?orgId=${orgId}`;

  // Provision Twilio number
  const { sid: twilioSid, phoneNumber } = await purchaseTwilioNumber(areaCode);
  await setTwilioWebhooks(twilioSid, appBaseUrl);

  // Create Retell LLM + agent
  const llmId = await createRetellLlm(businessName);
  const agentId = await createRetellAgent(businessName, llmId, retellWebhookUrl);

  // Save to DB
  const { data: saved, error } = await (admin as any)
    .from("org_phone_numbers")
    .insert({
      org_id: orgId,
      twilio_sid: twilioSid,
      e164_number: phoneNumber,
      retell_agent_id: agentId,
      retell_llm_id: llmId,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    // Rollback Twilio + Retell on DB failure
    await releaseTwilioNumber(twilioSid).catch(() => {});
    await deleteRetellAgent(agentId).catch(() => {});
    await deleteRetellLlm(llmId).catch(() => {});
    return NextResponse.json({ error: "Failed to save phone number" }, { status: 500 });
  }

  // Create default phone settings
  await (admin as any)
    .from("org_phone_settings")
    .upsert({ org_id: orgId }, { onConflict: "org_id", ignoreDuplicates: true });

  return NextResponse.json({ phoneNumber: saved });
}

/** DELETE — release the Twilio number and delete the Retell agent */
export async function DELETE() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: existing } = await (admin as any)
    .from("org_phone_numbers")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "No phone number found" }, { status: 404 });

  await releaseTwilioNumber(existing.twilio_sid).catch(() => {});
  if (existing.retell_agent_id) await deleteRetellAgent(existing.retell_agent_id).catch(() => {});
  if (existing.retell_llm_id) await deleteRetellLlm(existing.retell_llm_id).catch(() => {});

  await (admin as any).from("org_phone_numbers").delete().eq("org_id", orgId);

  return NextResponse.json({ success: true });
}
