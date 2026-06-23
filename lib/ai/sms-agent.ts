/**
 * AI SMS conversation engine.
 * Loads org config, builds context-aware system prompt, appends history, calls OpenAI.
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

export interface SmsMessage {
  direction: "inbound" | "outbound";
  body: string;
}

export async function runSmsAgent(
  orgId: string,
  conversationId: string,
  inboundText: string
): Promise<SmsAgentResult | null> {
  const admin = createAdminClient();

  const [
    { data: cfg },
    { data: org },
    { data: settings },
    { data: history },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("org_ai_assistant_config").select("*").eq("org_id", orgId).maybeSingle(),
    admin.from("orgs").select("name").eq("id", orgId).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("org_settings").select("dba_name, phone, service_area_description").eq("org_id", orgId).maybeSingle(),
    admin
      .from("sms_messages")
      .select("direction, body")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })
      .limit(40),
  ]);

  if (!cfg || !cfg.enabled) return null;

  const businessName = settings?.dba_name || org?.name || "the contractor";
  const serviceArea = cfg.service_area_description || settings?.service_area_description || null;
  const handoffPhrase = cfg.handoff_phrase || "Let me connect you with the team for that.";
  const tone = cfg.tone || "friendly";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Build services list (only enabled)
  let servicesBlock = "";
  if (cfg.services && Array.isArray(cfg.services)) {
    const enabled = cfg.services.filter((s: { enabled?: boolean }) => s.enabled !== false);
    if (enabled.length > 0) {
      servicesBlock = enabled.map((s: { name: string; description?: string }) =>
        `- ${s.name}${s.description ? `: ${s.description}` : ""}`
      ).join("\n");
    }
  }

  // Build FAQ block
  let faqBlock = "";
  if (cfg.faqs && Array.isArray(cfg.faqs) && cfg.faqs.length > 0) {
    faqBlock = cfg.faqs.map((f: { question: string; answer: string }) =>
      `Q: ${f.question}\nA: ${f.answer}`
    ).join("\n\n");
  }

  // Build qualifier questions block
  let qualifierBlock = "";
  if (cfg.qualifier_questions && Array.isArray(cfg.qualifier_questions) && cfg.qualifier_questions.length > 0) {
    qualifierBlock = cfg.qualifier_questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n");
  }

  // Build hours block
  let hoursBlock = "";
  if (cfg.business_hours && typeof cfg.business_hours === "object") {
    const h = cfg.business_hours as Record<string, { open: string; close: string; closed?: boolean }>;
    hoursBlock = Object.entries(h)
      .map(([day, val]) => val.closed ? `${day}: Closed` : `${day}: ${val.open}–${val.close}`)
      .join(", ");
  }

  // Build pricing ranges block
  let pricingBlock = "";
  if (cfg.pricing_ranges && Array.isArray(cfg.pricing_ranges) && cfg.pricing_ranges.length > 0) {
    pricingBlock = cfg.pricing_ranges.map((p: { service: string; range: string }) =>
      `- ${p.service}: ${p.range}`
    ).join("\n");
  }

  const systemPrompt = `You are ${businessName}'s SMS scheduling assistant. Your job is to qualify leads, answer questions, and book appointments via text.

## TONE
Keep responses ${tone}, concise, and SMS-appropriate (1-3 short sentences max). Never use asterisks or markdown.

## BUSINESS INFO
Business name: ${businessName}
Today: ${today}
${serviceArea ? `Service area: ${serviceArea}` : ""}
${hoursBlock ? `Business hours: ${hoursBlock}` : ""}

## SERVICES OFFERED
${servicesBlock || "General contracting services."}

## PRICING RANGES
${pricingBlock || "Pricing varies by job — we give exact quotes after assessment."}

## FREQUENTLY ASKED QUESTIONS
${faqBlock || "(none provided)"}

## CONVERSATION FLOW
Ask qualifying questions ONE AT A TIME in this order (only what hasn't been answered yet):
${qualifierBlock || "1. What type of work do you need done?\n2. What is your address or city?\n3. When are you hoping to get this done?"}

## BOOKING
When the customer agrees to a specific date and time, confirm it and return a JSON block at the end (the customer never sees this JSON):
BOOKING_JSON:{"date":"YYYY-MM-DD","time_window":"9am-12pm","job_type":"Short job description"}

## STRICT RULES
- If the question is outside the FAQ or service scope, say: "${handoffPhrase}"
- If the requested location is outside the service area, politely decline and say you don't service that area.
- Never make up prices outside the pricing ranges above.
- Never impersonate a human — you are ${businessName}'s scheduling assistant.
- If the customer texts STOP, UNSUBSCRIBE, QUIT, CANCEL, or END, reply only: "You have been unsubscribed. Reply START to re-subscribe."
- Keep every reply under 160 characters when possible.`;

  const msgs: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...((history ?? []) as SmsMessage[]).map((m) => ({
      role: m.direction === "outbound" ? ("assistant" as const) : ("user" as const),
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

  // Parse optional BOOKING_JSON from the end of the reply
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
    } catch { /* ignore parse errors */ }
    // Remove the booking JSON from the customer-facing reply
    reply = reply.replace(/\s*BOOKING_JSON:\{[^}]+\}/, "").trim();
  }

  return { reply, booking };
}
