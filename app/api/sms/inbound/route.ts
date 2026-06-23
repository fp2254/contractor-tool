/**
 * POST /api/sms/inbound
 * Twilio inbound SMS webhook. Validates signature, runs AI engine, sends reply.
 * Configure in Twilio console: Messaging → A Number → "A message comes in" → this URL.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioWebhook, sendSmsGraceful, emptyTwiml } from "@/lib/twilio";
import { runSmsAgent } from "@/lib/ai/sms-agent";

export const dynamic = "force-dynamic";

const OPT_OUT_KEYWORDS = /^(stop|unsubscribe|quit|cancel|end)$/i;
const OPT_IN_KEYWORDS = /^(start|yes|unstop)$/i;

/** Max outbound messages to one number in 24h before we stop. */
const RATE_LIMIT_24H = 10;

export async function POST(req: Request) {
  // Parse Twilio form body
  const text = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text));

  const from = params.From ?? "";
  const to = params.To ?? "";
  const body = (params.Body ?? "").trim();

  // Validate Twilio signature
  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!verifyTwilioWebhook(req.url, params, signature)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!from || !to || !body) return emptyTwiml();

  const admin = createAdminClient();

  // Look up org by the Twilio "to" number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: phoneRow } = await (admin as any)
    .from("org_phone_numbers")
    .select("org_id")
    .eq("e164_number", to)
    .eq("status", "active")
    .maybeSingle();

  if (!phoneRow?.org_id) return emptyTwiml();
  const orgId: string = phoneRow.org_id;

  // ── STOP / OPT-OUT ──────────────────────────────────────────────────────────
  if (OPT_OUT_KEYWORDS.test(body)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("opted_out_numbers").upsert(
      { org_id: orgId, phone_number: from },
      { onConflict: "org_id,phone_number" }
    );
    // Mark any active conversation as opted_out
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("sms_conversations")
      .update({ status: "opted_out", updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .eq("from_number", from)
      .eq("status", "active");

    await sendSmsGraceful(from, to, "You have been unsubscribed. Reply START to re-subscribe.");
    return emptyTwiml();
  }

  // ── START / OPT-IN ──────────────────────────────────────────────────────────
  if (OPT_IN_KEYWORDS.test(body)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("opted_out_numbers")
      .delete()
      .eq("org_id", orgId)
      .eq("phone_number", from);
    return emptyTwiml();
  }

  // ── OPT-OUT CHECK ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: optedOut } = await (admin as any)
    .from("opted_out_numbers")
    .select("id")
    .eq("org_id", orgId)
    .eq("phone_number", from)
    .maybeSingle();

  if (optedOut) return emptyTwiml();

  // ── LOAD OR CREATE CONVERSATION ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: conv } = await (admin as any)
    .from("sms_conversations")
    .select("id, status, lead_id")
    .eq("org_id", orgId)
    .eq("from_number", from)
    .in("status", ["active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // If handed_off or no active conv, create a new one (and possibly a new lead)
  if (!conv) {
    let leadId: string | null = null;

    // Try to find an existing lead with this phone number
    const digitsOnly = from.replace(/\D/g, "");
    if (digitsOnly) {
      const { data: existingLeads } = await admin
        .from("leads")
        .select("id, phone")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);

      const matched = (existingLeads ?? []).find(
        (l) => l.phone && l.phone.replace(/\D/g, "") === digitsOnly
      );
      if (matched) {
        leadId = matched.id;
      }
    }

    // No existing lead — create one
    if (!leadId) {
      const { data: newLead } = await admin
        .from("leads")
        .insert({
          org_id: orgId,
          name: `SMS Lead (${from})`,
          phone: from,
          status: "new",
          lead_source: "SMS",
        })
        .select("id")
        .single();
      leadId = newLead?.id ?? null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newConv } = await (admin as any)
      .from("sms_conversations")
      .insert({
        org_id: orgId,
        lead_id: leadId,
        from_number: from,
        to_number: to,
        status: "active",
      })
      .select("id, status, lead_id")
      .single();

    conv = newConv;
  }

  if (!conv?.id) return emptyTwiml();

  // ── LOG INBOUND MESSAGE ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("sms_messages").insert({
    conversation_id: conv.id,
    direction: "inbound",
    body,
  });

  // ── RATE LIMIT CHECK ─────────────────────────────────────────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from("sms_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conv.id)
    .eq("direction", "outbound")
    .gte("sent_at", since);

  if ((recentCount ?? 0) >= RATE_LIMIT_24H) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("sms_conversations")
      .update({ status: "exhausted", updated_at: new Date().toISOString() })
      .eq("id", conv.id);
    return emptyTwiml();
  }

  // ── LOAD AI CONFIG & CHECK IF ENABLED ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: aiCfg } = await (admin as any)
    .from("org_ai_assistant_config")
    .select("enabled, auto_reply")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!aiCfg?.enabled || !aiCfg?.auto_reply) return emptyTwiml();

  // ── RUN AI AGENT ────────────────────────────────────────────────────────────
  const result = await runSmsAgent(orgId, conv.id, body);
  if (!result?.reply) return emptyTwiml();

  // ── SEND REPLY ──────────────────────────────────────────────────────────────
  const sent = await sendSmsGraceful(from, to, result.reply);

  if (sent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("sms_messages").insert({
      conversation_id: conv.id,
      direction: "outbound",
      body: result.reply,
    });
  }

  // ── BOOKING DETECTED ────────────────────────────────────────────────────────
  if (result.booking && conv.lead_id) {
    const b = result.booking;
    const bookingNote = [
      "📅 AI Booking Confirmed",
      b.job_type ? `Job: ${b.job_type}` : null,
      b.date ? `Date: ${b.date}` : null,
      b.time_window ? `Time: ${b.time_window}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.all([
      (admin as any).from("notes").insert({
        org_id: orgId,
        entity_type: "lead",
        entity_id: conv.lead_id,
        body: bookingNote,
        created_by: null,
      }),
      admin
        .from("leads")
        .update({ status: "scheduled" })
        .eq("id", conv.lead_id)
        .eq("org_id", orgId),
    ]);
  }

  return emptyTwiml();
}
