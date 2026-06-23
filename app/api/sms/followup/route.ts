/**
 * POST /api/sms/followup
 * Proactive follow-up engine — enforces followup_max_attempts from org config.
 *
 * Call this endpoint on a schedule (e.g. every 2 hours) to nudge leads that
 * have not replied to the bot's initial message. It respects `followup_max_attempts`
 * per org and marks conversations `exhausted` when the limit is reached.
 *
 * Auth: requires X-Followup-Secret header matching FOLLOWUP_SECRET env var,
 * OR can be called server-side from a cron/webhook that has the secret.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSmsGraceful } from "@/lib/twilio";

export const dynamic = "force-dynamic";

/** Minimum hours of silence before we send a proactive follow-up. */
const SILENCE_HOURS = 2;

export async function POST(req: Request) {
  // Deny-by-default: FOLLOWUP_SECRET must be set in env vars.
  // Without it the endpoint is locked — this prevents accidental open access
  // to a route that can trigger bulk outbound SMS.
  const secret = process.env.FOLLOWUP_SECRET;
  if (!secret) {
    return new NextResponse("Service unavailable — FOLLOWUP_SECRET not configured", { status: 503 });
  }
  const provided = req.headers.get("x-followup-secret");
  if (provided !== secret) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const silenceCutoff = new Date(Date.now() - SILENCE_HOURS * 3600 * 1000).toISOString();

  // ── Find all orgs with AI + auto_reply enabled ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: configs } = await (admin as any)
    .from("org_ai_assistant_config")
    .select("org_id, followup_max_attempts")
    .eq("enabled", true)
    .eq("auto_reply", true);

  if (!configs || configs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let processed = 0;
  let exhausted = 0;

  for (const cfg of configs as { org_id: string; followup_max_attempts: number | null }[]) {
    const maxAttempts: number = cfg.followup_max_attempts ?? 2;

    // Find active conversations for this org where:
    // - last update was before the silence cutoff (no outbound sent recently either)
    // - followup_attempts < maxAttempts (counter-based budget check)
    // - not handed_off / opted_out / exhausted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: stalConvs } = await (admin as any)
      .from("sms_conversations")
      .select("id, from_number, to_number, lead_id, followup_attempts, last_customer_reply_at, updated_at")
      .eq("org_id", cfg.org_id)
      .eq("status", "active")
      .lt("followup_attempts", maxAttempts)
      .lt("updated_at", silenceCutoff);

    if (!stalConvs || stalConvs.length === 0) continue;

    // Load business name once per org
    const [{ data: org }, { data: orgSettings }] = await Promise.all([
      admin.from("orgs").select("name").eq("id", cfg.org_id).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("org_settings").select("dba_name").eq("org_id", cfg.org_id).maybeSingle(),
    ]);
    const businessName = orgSettings?.dba_name || org?.name || "us";

    for (const conv of stalConvs as {
      id: string;
      from_number: string;
      to_number: string;
      followup_attempts: number;
    }[]) {
      // 24h outbound-count check (per spec): count outbound messages to this
      // number in the last 24 hours. If already at/over the limit, skip.
      const window24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: recentOutbound } = await (admin as any)
        .from("sms_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("direction", "outbound")
        .gte("sent_at", window24h);

      if ((recentOutbound ?? 0) >= maxAttempts) {
        // Already at limit for this 24h window — mark exhausted
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any)
          .from("sms_conversations")
          .update({ status: "exhausted", updated_at: new Date().toISOString() })
          .eq("id", conv.id);
        exhausted++;
        continue;
      }

      const attempt = conv.followup_attempts + 1;
      const isLast = attempt >= maxAttempts || (recentOutbound ?? 0) + 1 >= maxAttempts;

      const message = isLast
        ? `Hi! Just checking in from ${businessName} — still interested in getting a quote? Reply anytime or call us directly.`
        : `Hi! This is ${businessName} following up on your inquiry. Do you have any questions?`;

      // Check opt-out before sending
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: optedOut } = await (admin as any)
        .from("opted_out_numbers")
        .select("id")
        .eq("org_id", cfg.org_id)
        .eq("phone_number", conv.from_number)
        .maybeSingle();

      if (optedOut) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any)
          .from("sms_conversations")
          .update({ status: "opted_out", updated_at: new Date().toISOString() })
          .eq("id", conv.id);
        continue;
      }

      const sent = await sendSmsGraceful(conv.from_number, conv.to_number, message);
      if (!sent) continue;

      const nowIso = new Date().toISOString();

      // Log to sms_messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("sms_messages").insert({
        conversation_id: conv.id,
        direction: "outbound",
        body: message,
      });

      // Increment counter + mark exhausted if this was the last attempt
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("sms_conversations")
        .update({
          followup_attempts: attempt,
          status: isLast ? "exhausted" : "active",
          updated_at: nowIso,
        })
        .eq("id", conv.id);

      processed++;
      if (isLast) exhausted++;
    }
  }

  return NextResponse.json({ ok: true, processed, exhausted });
}
