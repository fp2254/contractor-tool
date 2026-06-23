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

/**
 * Deterministically compute which question the bot should ask next.
 * Qualification stages are strictly ordered:
 *   1. Job type  →  2. Service area (if configured)  →  3. Custom qualifiers  →  4. Availability
 *
 * We derive the stage by counting outbound messages already sent in this
 * conversation, NOT by asking the AI to interpret conversation history.
 * This guarantees the ordering requirement is always honoured.
 */
function computeNextDirective(
  outboundCount: number,
  serviceArea: string | null,
  customQualifiers: string[]
): string {
  // Stage 1 — no outbound yet: greeting + ask job type
  if (outboundCount === 0) {
    return "DIRECTIVE: This is your opening message. Greet the customer warmly and ask what type of work they need done. One sentence only.";
  }

  // Stage 2 — service area check (only when service_area is configured)
  if (serviceArea && outboundCount === 1) {
    return `DIRECTIVE: You have their job type. Now ask for their address or city so you can confirm it's within your service area (${serviceArea}).`;
  }

  // Stage 3 — custom qualifier questions (in strict order, one per turn)
  const customStartsAt = serviceArea ? 2 : 1;
  const customIdx = outboundCount - customStartsAt;
  if (customIdx >= 0 && customIdx < customQualifiers.length) {
    const q = customQualifiers[customIdx];
    return `DIRECTIVE: Ask this qualifying question (${customIdx + 1} of ${customQualifiers.length}): "${q}" — nothing else.`;
  }

  // Stage 4 — all qualifiers answered: propose availability
  return "DIRECTIVE: All qualifying questions have been answered. Propose 1–2 specific available dates from the schedule below. If the customer has already agreed to a date, confirm it and append BOOKING_JSON.";
}

/** Format a date as "Monday, June 23" */
function formatDateLabel(isoDate: string): string {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

type SmsHistoryMsg = { direction: "inbound" | "outbound"; body: string };

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
  const customQualifiers: string[] = Array.isArray(cfg.qualifier_questions)
    ? (cfg.qualifier_questions as string[])
    : [];
  const qualifierBlock =
    customQualifiers.length > 0
      ? customQualifiers.map((q, i) => `${i + 1}. ${q}`).join("\n")
      : "";

  // ── Compute available days from real schedule data ─────────────────────────
  const jobsPerDay: Record<string, number> = {};
  for (const j of upcomingJobs ?? []) {
    if (!j.scheduled_date) continue;
    jobsPerDay[j.scheduled_date] = (jobsPerDay[j.scheduled_date] ?? 0) + 1;
  }

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
    [1, 2, 3, 4, 5].forEach((n) => workDayNums.add(n));
  }

  const availableDays: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
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
      : "Schedule is full for the next two weeks — ask the customer for their preferred date and note you will confirm availability.";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Deterministic stage directive ─────────────────────────────────────────
  // Count outbound messages already sent to know exactly which stage we're at.
  // This enforces strict ordering without relying on AI text interpretation.
  const historyMsgs = (history ?? []) as SmsHistoryMsg[];
  const outboundCount = historyMsgs.filter((m) => m.direction === "outbound").length;
  const nextDirective = computeNextDirective(outboundCount, serviceArea, customQualifiers);

  // Build stage list for the prompt
  const stageLines: string[] = [
    "Stage 1: Job type — what work does the customer need?",
  ];
  if (serviceArea) stageLines.push(`Stage 2: Service area — confirm location is within: ${serviceArea}.`);
  if (customQualifiers.length > 0) {
    stageLines.push(`Stage ${serviceArea ? 3 : 2}: Custom qualifiers (ask one at a time):\n${qualifierBlock}`);
  }
  const lastStage = (serviceArea ? 1 : 0) + (customQualifiers.length > 0 ? 1 : 0) + 2;
  stageLines.push(`Stage ${lastStage}: Availability — propose dates from the schedule.`);

  const systemPrompt = [
    `You are ${businessName}'s SMS scheduling assistant. Qualify leads, answer questions, and book appointments via text.`,
    "",
    "## TONE",
    `Keep responses ${tone}, concise, and SMS-appropriate (1–3 short sentences max). Never use asterisks or markdown.`,
    "",
    "## BUSINESS INFO",
    `Business name: ${businessName}`,
    `Today: ${today}`,
    serviceArea ? `Service area: ${serviceArea}` : "",
    hoursBlock ? `Business hours: ${hoursBlock}` : "",
    "",
    "## SERVICES OFFERED",
    servicesBlock,
    "",
    pricingBlock ? `## PRICING\n${pricingBlock}\n` : "",
    "## SCHEDULE AVAILABILITY (real-time calendar data)",
    scheduleBlock,
    "",
    "## FREQUENTLY ASKED QUESTIONS",
    faqBlock || "(No FAQs on file — defer specific questions to the owner)",
    "",
    "## QUALIFICATION STAGES (strict order — do not skip ahead)",
    stageLines.join("\n"),
    "",
    "## CURRENT DIRECTIVE (follow this EXACTLY for your reply this turn)",
    nextDirective,
    "",
    "## BOOKING CONFIRMATION",
    'When the customer explicitly agrees to a specific date (e.g. "Yes, Thursday works"), confirm it and append this JSON at the very END of your reply (the customer never sees this):',
    'BOOKING_JSON:{"date":"YYYY-MM-DD","time_window":"9am-12pm","job_type":"short description"}',
    "Only append BOOKING_JSON when the customer has clearly agreed to a slot. Never append it speculatively.",
    "",
    "## STRICT RULES",
    "- Follow the CURRENT DIRECTIVE above — do not skip to a later stage.",
    "- Only answer questions answerable from the information above.",
    '- If asked something outside your knowledge: "Good question — let me have the team follow up on that."',
    "- If requested location is outside the service area, politely decline.",
    pricingBlock
      ? "- Never quote prices outside the ranges listed above."
      : "- Do not quote prices — say you will provide a quote after assessment.",
    `- Never impersonate a human. You are ${businessName}'s assistant.`,
    "- Keep every reply under 160 characters when possible.",
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");

  type MsgRole = "system" | "user" | "assistant";

  const msgs: { role: MsgRole; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...historyMsgs.map((m) => ({
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
    reply = reply.replace(/\s*BOOKING_JSON:\{[^}]+\}/, "").trim();
  }

  return { reply, booking };
}
