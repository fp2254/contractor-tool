/**
 * Auto-reply trigger — fires the AI opening SMS when a new lead arrives.
 * Called fire-and-forget from lead creation routes.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSmsGraceful } from "@/lib/twilio";

const OPT_OUT_KEYWORDS = /^(stop|unsubscribe|quit|cancel|end)$/i;

export async function maybeSendAutoReply(
  orgId: string,
  leadId: string,
  customerPhone: string | null | undefined
): Promise<void> {
  if (!customerPhone) return;

  try {
    const admin = createAdminClient();

    // Load AI assistant config — check if auto_reply is enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cfg } = await (admin as any)
      .from("org_ai_assistant_config")
      .select("enabled, auto_reply")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!cfg?.enabled || !cfg?.auto_reply) return;

    // Load org phone number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: phoneRow } = await (admin as any)
      .from("org_phone_numbers")
      .select("e164_number")
      .eq("org_id", orgId)
      .eq("status", "active")
      .maybeSingle();

    if (!phoneRow?.e164_number) return;

    const fromNumber: string = phoneRow.e164_number;

    // Normalize customer phone to E.164 (best-effort)
    const digits = customerPhone.replace(/\D/g, "");
    const toNumber =
      digits.startsWith("1") && digits.length === 11
        ? `+${digits}`
        : digits.length === 10
        ? `+1${digits}`
        : customerPhone;

    if (OPT_OUT_KEYWORDS.test(toNumber)) return;

    // Check opt-out list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: optedOut } = await (admin as any)
      .from("opted_out_numbers")
      .select("id")
      .eq("org_id", orgId)
      .eq("phone_number", toNumber)
      .maybeSingle();

    if (optedOut) return;

    // Check for existing active conversation with this number (avoid double-reply)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingConv } = await (admin as any)
      .from("sms_conversations")
      .select("id")
      .eq("org_id", orgId)
      .eq("from_number", toNumber)
      .in("status", ["active"])
      .maybeSingle();

    if (existingConv) return;

    // Load business name for greeting
    const [{ data: org }, { data: orgSettings }] = await Promise.all([
      admin.from("orgs").select("name").eq("id", orgId).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any)
        .from("org_settings")
        .select("dba_name")
        .eq("org_id", orgId)
        .maybeSingle(),
    ]);
    const businessName = orgSettings?.dba_name || org?.name || "us";

    const greeting = `Hi! Thanks for reaching out to ${businessName}. What type of work are you looking to get done?`;

    // Create conversation row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv } = await (admin as any)
      .from("sms_conversations")
      .insert({
        org_id: orgId,
        lead_id: leadId,
        from_number: toNumber,
        to_number: fromNumber,
        status: "active",
      })
      .select("id")
      .single();

    if (!conv?.id) return;

    // Send the greeting
    const sent = await sendSmsGraceful(toNumber, fromNumber, greeting);

    if (sent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("sms_messages").insert({
        conversation_id: conv.id,
        direction: "outbound",
        body: greeting,
      });
    }
  } catch (err) {
    console.error("[sms-trigger] maybeSendAutoReply error:", err);
  }
}
