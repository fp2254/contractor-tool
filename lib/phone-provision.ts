import { createAdminClient } from "@/lib/supabase/admin";
import { purchaseTwilioNumber, setTwilioWebhooks, releaseTwilioNumber, getAppBaseUrl } from "@/lib/twilio";
import { createRetellAgent, createRetellLlm, deleteRetellAgent, deleteRetellLlm } from "@/lib/retell";

export async function autoProvisionIfNeeded(orgId: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return;
  if (!process.env.RETELL_API_KEY) return;

  const admin = createAdminClient();

  const { data: existing } = await (admin as any)
    .from("org_phone_numbers")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (existing) return;

  const { data: org } = await admin.from("orgs").select("name").eq("id", orgId).single();
  const businessName = (org as any)?.name ?? "Your Business";

  const appBaseUrl = getAppBaseUrl();
  const retellWebhookUrl = `${appBaseUrl}/api/webhooks/retell/transcript?orgId=${orgId}`;

  const { sid: twilioSid, phoneNumber } = await purchaseTwilioNumber(undefined);
  await setTwilioWebhooks(twilioSid, appBaseUrl);

  const llmId = await createRetellLlm(businessName);
  const agentId = await createRetellAgent(businessName, llmId, retellWebhookUrl);

  const { error } = await (admin as any)
    .from("org_phone_numbers")
    .insert({
      org_id: orgId,
      twilio_sid: twilioSid,
      e164_number: phoneNumber,
      retell_agent_id: agentId,
      retell_llm_id: llmId,
      status: "active",
    });

  if (error) {
    await releaseTwilioNumber(twilioSid).catch(() => {});
    await deleteRetellAgent(agentId).catch(() => {});
    await deleteRetellLlm(llmId).catch(() => {});
    throw error;
  }

  await (admin as any)
    .from("org_phone_settings")
    .upsert({ org_id: orgId }, { onConflict: "org_id", ignoreDuplicates: true });
}
