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

/** Fallback rate limit if org config doesn't specify one. */
const DEFAULT_RATE_LIMIT = 20;

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
    // Mark any active/exhausted conversation as opted_out
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("sms_conversations")
      .update({ status: "opted_out", updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .eq("from_number", from)
      .in("status", ["active", "exhausted"]);

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

  // ── LOAD AI CONFIG (needed for rate limit + take-over gate) ─────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: aiCfg } = await (admin as any)
    .from("org_ai_assistant_config")
    .select("enabled, auto_reply, followup_max_attempts, require_booking_approval")
    .eq("org_id", orgId)
    .maybeSingle();

  const rateLimit: number = aiCfg?.followup_max_attempts ?? DEFAULT_RATE_LIMIT;

  // ── FIND MOST RECENT CONVERSATION FOR THIS NUMBER ────────────────────────────
  // Look for ANY conversation (all statuses) — this is how we honour take-over.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentConv } = await (admin as any)
    .from("sms_conversations")
    .select("id, status, lead_id")
    .eq("org_id", orgId)
    .eq("from_number", from)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── HANDED-OFF / OPTED-OUT / EXHAUSTED: log inbound, stay silent ────────────
  // If the contractor has taken over (handed_off) or the conversation is
  // otherwise closed, we still log the message so it appears in the thread,
  // but we DO NOT create a new active AI conversation or run the AI.
  if (recentConv && recentConv.status !== "active") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("sms_messages").insert({
      conversation_id: recentConv.id,
      direction: "inbound",
      body,
    });
    return emptyTwiml();
  }

  // ── GET OR CREATE ACTIVE CONVERSATION ───────────────────────────────────────
  let conv = recentConv; // already active if we're here and recentConv exists

  if (!conv) {
    // No conversation at all — create one (and possibly a new lead)
    let leadId: string | null = null;

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
      if (matched) leadId = matched.id;
    }

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

  // ── RATE LIMIT CHECK (uses org config followup_max_attempts) ────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from("sms_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conv.id)
    .eq("direction", "outbound")
    .gte("sent_at", since);

  if ((recentCount ?? 0) >= rateLimit) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("sms_conversations")
      .update({ status: "exhausted", updated_at: new Date().toISOString() })
      .eq("id", conv.id);
    return emptyTwiml();
  }

  // ── AI CONFIG CHECK ──────────────────────────────────────────────────────────
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
    const requiresApproval = aiCfg?.require_booking_approval ?? false;

    const bookingNote = [
      requiresApproval ? "📅 AI Booking — Pending Your Approval" : "📅 AI Booking Confirmed",
      b.job_type ? `Job: ${b.job_type}` : null,
      b.date ? `Date: ${b.date}` : null,
      b.time_window ? `Time: ${b.time_window}` : null,
      requiresApproval ? "⚠️ Review and confirm this booking before it is finalized." : null,
    ]
      .filter(Boolean)
      .join("\n");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePromises: Promise<unknown>[] = [
      (admin as any).from("notes").insert({
        org_id: orgId,
        entity_type: "lead",
        entity_id: conv.lead_id,
        body: bookingNote,
        created_by: null,
      }),
    ];

    if (!requiresApproval) {
      // Auto-confirm: set lead to scheduled and record scheduled date
      updatePromises.push(
        admin
          .from("leads")
          .update({ status: "scheduled" })
          .eq("id", conv.lead_id)
          .eq("org_id", orgId)
      );
    }
    // If require_booking_approval: lead stays at current status so contractor
    // reviews the note and manually confirms. AI reply already told the customer
    // the slot is provisionally held.

    await Promise.allSettled(updatePromises);
  }

  return emptyTwiml();
}
