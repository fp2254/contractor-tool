/**
 * POST /api/sms/inbound
 * Twilio inbound SMS webhook. Validates signature, runs AI engine, sends reply.
 * Configure in Twilio console: Messaging → A Number → "A message comes in" → this URL.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioWebhook, sendSmsGraceful, emptyTwiml } from "@/lib/twilio";
import { runSmsAgent } from "@/lib/ai/sms-agent";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const OPT_OUT_KEYWORDS = /^(stop|unsubscribe|quit|cancel|end)$/i;
const OPT_IN_KEYWORDS = /^(start|yes|unstop)$/i;

/**
 * Abuse-prevention cap: max outbound messages per conversation per 24h.
 * This is NOT followup_max_attempts — that config governs proactive follow-ups
 * to non-responders (future feature). Here we are RESPONDING to an inbound
 * message, so the follow-up cadence limit must not apply.
 */
const INBOUND_REPLY_SAFETY_CAP = 50;

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

  // ── LOAD AI CONFIG ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: aiCfg } = await (admin as any)
    .from("org_ai_assistant_config")
    .select("enabled, auto_reply, require_booking_approval")
    .eq("org_id", orgId)
    .maybeSingle();

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

  // ── ABUSE-PREVENTION SAFETY CAP ─────────────────────────────────────────────
  // We are REPLYING to an inbound message — followup_max_attempts does NOT apply
  // here (that config governs proactive follow-ups to non-responders).
  // Apply a high per-conversation cap to prevent runaway API costs only.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from("sms_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conv.id)
    .eq("direction", "outbound")
    .gte("sent_at", since);

  if ((recentCount ?? 0) >= INBOUND_REPLY_SAFETY_CAP) {
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
    const requiresApproval: boolean = aiCfg?.require_booking_approval ?? true;

    // Load lead to get customer_id + name
    const { data: lead } = await admin
      .from("leads")
      .select("name, converted_customer_id")
      .eq("id", conv.lead_id)
      .eq("org_id", orgId)
      .maybeSingle();

    const jobType = b.job_type || (lead?.name ? `Job for ${lead.name}` : "AI Booked Job");

    // 1. Always create a durable sms_pending_bookings record.
    //    This is the explicit pending_confirmation artifact the contractor reviews.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendingBooking } = await (admin as any)
      .from("sms_pending_bookings")
      .insert({
        org_id: orgId,
        conversation_id: conv.id,
        lead_id: conv.lead_id,
        job_type: jobType,
        booking_date: b.date ?? null,
        booking_time: b.time_window ?? null,
        status: requiresApproval ? "pending_approval" : "confirmed",
      })
      .select("id")
      .single();

    // 2. If auto-confirm AND lead has a converted customer: create a real job.
    //    (Jobs require customer_id — skip job creation if lead is unconverted.)
    let newJobId: string | null = null;
    if (!requiresApproval && lead?.converted_customer_id) {
      const jobNotes = [
        "Booked via AI SMS assistant.",
        b.time_window ? `Time window: ${b.time_window}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newJob, error: jobErr } = await (admin as any)
        .from("jobs")
        .insert({
          org_id: orgId,
          customer_id: lead.converted_customer_id,
          job_title: jobType,
          status: "scheduled",
          scheduled_date: b.date ?? null,
          notes: jobNotes,
        })
        .select("id")
        .single();

      if (jobErr) {
        console.error("[sms/inbound] job insert failed:", jobErr.message);
      } else {
        newJobId = newJob?.id ?? null;
        // Link job back to pending_bookings row
        if (pendingBooking?.id && newJobId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin as any)
            .from("sms_pending_bookings")
            .update({ job_id: newJobId, updated_at: new Date().toISOString() })
            .eq("id", pendingBooking.id);
        }
      }
    }

    // 3. Add a note on the lead summarising the booking for the contractor
    const noteBody = [
      requiresApproval ? "📅 AI Booking — Awaiting Your Approval" : "📅 AI Booking Confirmed",
      b.job_type ? `Service: ${b.job_type}` : null,
      b.date ? `Date: ${b.date}` : null,
      b.time_window ? `Time: ${b.time_window}` : null,
      requiresApproval ? "Review and approve in the activity log (/app/activity)." : null,
      newJobId ? `Job scheduled (ID: ${newJobId.slice(0, 8)}).` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sideEffects: Promise<unknown>[] = [
      (admin as any).from("notes").insert({
        org_id: orgId,
        entity_type: "lead",
        entity_id: conv.lead_id,
        body: noteBody,
        created_by: null,
      }),
    ];

    if (!requiresApproval) {
      sideEffects.push(
        admin
          .from("leads")
          .update({ status: "scheduled" })
          .eq("id", conv.lead_id)
          .eq("org_id", orgId)
      );
    }

    await Promise.allSettled(sideEffects);

    // 4. In-app notification via activity log (visible on /app/activity)
    logActivity({
      orgId,
      entityType: "lead",
      entityId: conv.lead_id,
      action: requiresApproval ? "sms_booking_pending" : "sms_booking_confirmed",
      description: requiresApproval
        ? `AI booked ${jobType} — awaiting your approval (${b.date ?? "date TBD"})`
        : `AI confirmed booking: ${jobType} on ${b.date ?? "TBD"}`,
      metadata: {
        pending_booking_id: pendingBooking?.id ?? null,
        job_id: newJobId,
        booking_date: b.date,
        booking_time: b.time_window,
        requires_approval: requiresApproval,
      },
    }).catch(() => {});
  }

  return emptyTwiml();
}
