/**
 * POST /api/sms/send
 * Manually send an outbound SMS from a contractor to a lead's phone.
 * Works whether there is an existing handed_off conversation or no conversation at all.
 *
 * Body (JSON):
 *   { conversationId?: string, leadId?: string, message: string }
 *
 * Either conversationId OR leadId must be provided.
 * When only leadId is provided (no existing conversation), a new handed_off conversation
 * is created so the thread is visible in the UI.
 */
import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSmsGraceful } from "@/lib/twilio";

export const dynamic = "force-dynamic";

/** Max outbound messages per conversation per 24 h (shared cap with inbound reply path). */
const RATE_LIMIT_24H = 50;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { conversationId, leadId, message } = body as {
    conversationId?: string;
    leadId?: string;
    message?: string;
  };

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (!conversationId && !leadId) {
    return NextResponse.json({ error: "conversationId or leadId is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const trimmedMessage = message.trim();

  // ── RESOLVE CONVERSATION ─────────────────────────────────────────────────────
  let conv: { id: string; from_number: string; to_number: string; status: string } | null = null;

  if (conversationId) {
    // Load existing conversation and verify it belongs to this org
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("sms_conversations")
      .select("id, from_number, to_number, status")
      .eq("id", conversationId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    conv = data;
  } else {
    // No conversationId — look up lead phone + org phone, find or create conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lead } = await (admin as any)
      .from("leads")
      .select("id, phone")
      .eq("id", leadId!)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!lead?.phone) {
      return NextResponse.json(
        { error: "Lead has no phone number — cannot send SMS" },
        { status: 422 }
      );
    }

    // Look up the org's active Twilio number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: phoneRow } = await (admin as any)
      .from("org_phone_numbers")
      .select("e164_number")
      .eq("org_id", orgId)
      .eq("status", "active")
      .maybeSingle();

    if (!phoneRow?.e164_number) {
      return NextResponse.json(
        { error: "No active phone number on this account — add a phone number first" },
        { status: 422 }
      );
    }

    // Find the most recent conversation for this lead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingConv } = await (admin as any)
      .from("sms_conversations")
      .select("id, from_number, to_number, status")
      .eq("org_id", orgId)
      .eq("lead_id", leadId!)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingConv) {
      conv = existingConv;
    } else {
      // No conversation at all — create a new handed_off one
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newConv, error: createErr } = await (admin as any)
        .from("sms_conversations")
        .insert({
          org_id: orgId,
          lead_id: leadId,
          from_number: lead.phone,
          to_number: phoneRow.e164_number,
          status: "handed_off",
        })
        .select("id, from_number, to_number, status")
        .single();

      if (createErr || !newConv) {
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }
      conv = newConv;
    }
  }

  if (!conv) {
    return NextResponse.json({ error: "Could not resolve conversation" }, { status: 500 });
  }

  // ── OPTED-OUT CHECK ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: optedOut } = await (admin as any)
    .from("opted_out_numbers")
    .select("id")
    .eq("org_id", orgId)
    .eq("phone_number", conv.from_number)
    .maybeSingle();

  if (optedOut) {
    return NextResponse.json(
      { error: "This customer has opted out of SMS messages" },
      { status: 422 }
    );
  }

  // ── RATE LIMIT CHECK ─────────────────────────────────────────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from("sms_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conv.id)
    .eq("direction", "outbound")
    .gte("sent_at", since);

  if ((recentCount ?? 0) >= RATE_LIMIT_24H) {
    return NextResponse.json(
      { error: "Rate limit reached — maximum 50 outbound messages per 24 hours" },
      { status: 429 }
    );
  }

  // ── SEND VIA TWILIO ──────────────────────────────────────────────────────────
  const sent = await sendSmsGraceful(conv.from_number, conv.to_number, trimmedMessage);

  if (!sent) {
    return NextResponse.json(
      { error: "Failed to send SMS — check Twilio credentials" },
      { status: 502 }
    );
  }

  // ── SAVE TO DATABASE ─────────────────────────────────────────────────────────
  const sentAt = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: savedMsg, error: msgErr } = await (admin as any)
    .from("sms_messages")
    .insert({
      conversation_id: conv.id,
      direction: "outbound",
      body: trimmedMessage,
      sent_at: sentAt,
    })
    .select("id, direction, body, sent_at")
    .single();

  if (msgErr) {
    console.error("[sms/send] message insert failed:", msgErr.message);
    // Message was already sent — return success with a synthetic record
    return NextResponse.json({
      ok: true,
      conversationId: conv.id,
      message: { id: crypto.randomUUID(), direction: "outbound", body: trimmedMessage, sent_at: sentAt },
    });
  }

  // If conversation was exhausted or active (AI still on), mark it handed_off
  // so the thread UI reflects that the contractor has taken over.
  if (conv.status !== "handed_off") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("sms_conversations")
      .update({ status: "handed_off", updated_at: sentAt })
      .eq("id", conv.id)
      .eq("org_id", orgId);
  }

  return NextResponse.json({
    ok: true,
    conversationId: conv.id,
    message: savedMsg,
  });
}
