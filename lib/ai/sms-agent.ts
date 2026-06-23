/**
 * AI SMS conversation engine.
 * Loads org config (aligned to org_ai_assistant_config schema), builds context-
 * aware system prompt with real schedule availability, calls OpenAI.
 * Returns structured reply with optional booking detection.
 */
import { getOpenAIClient } from "@/lib/openai";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SmsAgentResult {
  reply: string;
  booking: {
    date: string | null;
    time_window: string | null;
    job_type: string | null;
  } | null;
}

/** Max jobs per day before we consider a day "full". */
const MAX_JOBS_PER_DAY = 3;

/** Days ahead to include in schedule availability. */
const SCHEDULE_HORIZON_DAYS = 14;

/** Format a date as "Monday, June 23" */
function formatDateLabel(isoDate: string): string {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function runSmsAgent(
  orgId: string,
  conversationId: string,
  inboundText: string
): Promise<SmsAgentResult | null> {
  const admin = createAdminClient();

  const todayStr = new Date().toISOString().slice(0, 10);
  const horizonStr = new Date(Date.now() + SCHEDULE_HORIZON_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);

  const [
    { data: cfg },
    { data: org },
    { data: settings },
    { data: presets },
    { data: history },
    { data: upcomingJobs },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("org_ai_assistant_config")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle(),
    admin.from("orgs").select("name").eq("id", orgId).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("org_settings")
      .select("dba_name, phone")
      .eq("org_id", orgId)
      .maybeSingle(),
    // Load active service presets so we can filter out disabled ones
    admin
      .from("service_presets")
      .select("id, service_name, description, category")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    admin
      .from("sms_messages")
      .select("direction, body")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })
      .limit(40),
    // Real upcoming jobs for availability calculation
    admin
      .from("jobs")
      .select("scheduled_date")
      .eq("org_id", orgId)
      .gte("scheduled_date", todayStr)
      .lte("scheduled_date", horizonStr)
      .not("status", "in", '("cancelled","invoiced")'),
  ]);

  if (!cfg || !cfg.enabled) return null;

  const businessName = settings?.dba_name || org?.name || "the contractor";

  // ── Service area (schema field: service_area) ──────────────────────────────
  const serviceArea: string | null = cfg.service_area ?? null;

  // ── Tone ──────────────────────────────────────────────────────────────────
  const tone: string = cfg.tone ?? "casual";

  // ── Business hours (schema: {days:[...], open:"HH:MM", close:"HH:MM"}) ───
  let hoursBlock = "";
  if (cfg.business_hours && typeof cfg.business_hours === "object") {
    const h = cfg.business_hours as {
      days?: string[];
      open?: string;
      close?: string;
    };
    if (h.days && h.open && h.close) {
      const dayNames = (h.days as string[]).join(", ");
      hoursBlock = `${dayNames}: ${h.open}–${h.close}`;
    }
  }

  // ── Services (active presets minus disabled_service_ids) ──────────────────
  const disabledIds: string[] = Array.isArray(cfg.disabled_service_ids)
    ? (cfg.disabled_service_ids as string[])
    : [];
  const enabledPresets = (presets ?? []).filter((p) => !disabledIds.includes(p.id));
  const servicesBlock =
    enabledPresets.length > 0
      ? enabledPresets
          .map(
            (p) =>
              `- ${p.service_name}${p.description ? `: ${p.description}` : ""}${p.category ? ` [${p.category}]` : ""}`
          )
          .join("\n")
      : "General contracting services.";

  // ── Pricing ranges (schema: [{preset_id, label, min, max}]) ──────────────
  let pricingBlock = "";
  if (cfg.show_pricing && Array.isArray(cfg.pricing_ranges) && cfg.pricing_ranges.length > 0) {
    const ranges = cfg.pricing_ranges as {
      preset_id?: string;
      label?: string;
      min?: number;
      max?: number;
    }[];
    pricingBlock = ranges
      .filter((r) => r.label)
      .map((r) => {
        const rangeStr =
          r.min != null && r.max != null
            ? `$${r.min}–$${r.max}`
            : r.min != null
            ? `from $${r.min}`
            : r.max != null
            ? `up to $${r.max}`
            : "";
        return `- ${r.label}${rangeStr ? `: ${rangeStr}` : ""}`;
      })
      .join("\n");
  }

  // ── FAQs (schema: [{q, a}]) ───────────────────────────────────────────────
  let faqBlock = "";
  if (Array.isArray(cfg.faqs) && cfg.faqs.length > 0) {
    const faqs = cfg.faqs as { q?: string; a?: string }[];
    faqBlock = faqs
      .filter((f) => f.q && f.a)
      .map((f) => `Q: ${f.q}\nA: ${f.a}`)
      .join("\n\n");
  }

  // ── Qualifier questions (schema: string[]) ────────────────────────────────
  let qualifierBlock = "";
  if (Array.isArray(cfg.qualifier_questions) && cfg.qualifier_questions.length > 0) {
    qualifierBlock = (cfg.qualifier_questions as string[])
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");
  }

  // ── Compute available days from real schedule data ─────────────────────────
  const jobsPerDay: Record<string, number> = {};
  for (const j of upcomingJobs ?? []) {
    if (!j.scheduled_date) continue;
    jobsPerDay[j.scheduled_date] = (jobsPerDay[j.scheduled_date] ?? 0) + 1;
  }

  // Build business_hours days set for schedule filtering
  const workDayNums = new Set<number>();
  const dayMap: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  if (cfg.business_hours?.days && Array.isArray(cfg.business_hours.days)) {
    for (const d of cfg.business_hours.days as string[]) {
      const n = dayMap[d.toLowerCase()];
      if (n != null) workDayNums.add(n);
    }
  } else {
    // Default Mon-Fri
    [1, 2, 3, 4, 5].forEach((n) => workDayNums.add(n));
  }

  const availableDays: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1); // start tomorrow
  for (let i = 0; i < SCHEDULE_HORIZON_DAYS && availableDays.length < 6; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const dow = cursor.getUTCDay();
    if (workDayNums.has(dow) && (jobsPerDay[iso] ?? 0) < MAX_JOBS_PER_DAY) {
      availableDays.push(`${formatDateLabel(iso)} (${iso})`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const scheduleBlock =
    availableDays.length > 0
      ? `Available appointment days:\n${availableDays.map((d) => `- ${d}`).join("\n")}\nOnly offer dates from this list when proposing appointments.`
      : "Schedule is full for the next two weeks — ask the customer for preferred date and note you will confirm availability.";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemPrompt = `You are ${businessName}'s SMS scheduling assistant. Your job is to qualify leads, answer questions, and book appointments via text.

## TONE
Keep responses ${tone}, concise, and SMS-appropriate (1-3 short sentences max). Never use asterisks or markdown.

## BUSINESS INFO
Business name: ${businessName}
Today: ${today}
${serviceArea ? `Service area: ${serviceArea}` : ""}
${hoursBlock ? `Business hours: ${hoursBlock}` : ""}

## SERVICES OFFERED
${servicesBlock}

${pricingBlock ? `## PRICING\n${pricingBlock}\n` : ""}
## SCHEDULE AVAILABILITY (real-time calendar data)
${scheduleBlock}

## FREQUENTLY ASKED QUESTIONS
${faqBlock || "(No FAQs on file — defer specific questions to the owner)"}

## CONVERSATION FLOW
Ask qualifying questions ONE AT A TIME in this order (skip already answered):
${qualifierBlock || "1. What type of work do you need done?\n2. What is your address or city?\n3. When are you hoping to get this scheduled?"}

Once all qualifying questions are answered, propose one or two specific dates from the schedule.

## BOOKING CONFIRMATION
When the customer explicitly agrees to a specific date and time (e.g. "Yes, Thursday works"), confirm it and append this JSON at the very END of your reply (the customer never sees this):
BOOKING_JSON:{"date":"YYYY-MM-DD","time_window":"9am-12pm","job_type":"short description"}

Only append BOOKING_JSON when the customer has clearly agreed to a slot. Never append it speculatively.

## STRICT RULES
- Only answer questions that can be answered from the information above.
- If a question is outside these topics, reply: "Good question — let me have the team follow up with you on that."
- If the requested location is outside the service area, politely decline and say you don't cover that area.
${pricingBlock ? "- Never quote prices outside the ranges listed above." : "- Do not quote prices — say you will provide a quote after assessment."}
- Never impersonate a human. You are ${businessName}'s assistant.
- Keep every reply under 160 characters when possible.`;

  type MsgRole = "system" | "user" | "assistant";
  type SmsHistoryMsg = { direction: "inbound" | "outbound"; body: string };

  const msgs: { role: MsgRole; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...((history ?? []) as SmsHistoryMsg[]).map((m) => ({
      role: (m.direction === "outbound" ? "assistant" : "user") as MsgRole,
      content: m.body,
    })),
    { role: "user", content: inboundText },
  ];

  const openai = getOpenAIClient();
  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: msgs,
      max_completion_tokens: 300,
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[sms-agent] OpenAI error:", err);
    return null;
  }

  // ── Parse optional BOOKING_JSON from end of reply ─────────────────────────
  let booking: SmsAgentResult["booking"] = null;
  let reply = raw.trim();

  const bookingMatch = reply.match(/BOOKING_JSON:(\{[^}]+\})/);
  if (bookingMatch) {
    try {
      const b = JSON.parse(bookingMatch[1]);
      booking = {
        date: b.date ?? null,
        time_window: b.time_window ?? null,
        job_type: b.job_type ?? null,
      };
    } catch {
      /* ignore parse errors */
    }
    // Strip the JSON signal from the customer-facing reply
    reply = reply.replace(/\s*BOOKING_JSON:\{[^}]+\}/, "").trim();
  }

  return { reply, booking };
}
