import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMessages } from "@/lib/ai/prompt";

export const dynamic = "force-dynamic";

const lineItemSchema = z.object({
  preset_id: z.string().nullable().default(null),
  description: z.string(),
  qty: z.number().default(1),
  unit: z.string().default("each"),
  unit_price: z.number().nullable().default(null),
  needs_manual_pricing: z.boolean().default(false),
  is_ai_estimate: z.boolean().default(false),
});

const customerMatchSchema = z.object({
  customer_id: z.string().nullable().default(null),
  matched_name: z.string().default(""),
  confidence: z.enum(["high", "medium", "none"]).default("none"),
});

const outputSchema = z.object({
  job_title: z.string().default("New Job"),
  customer: z.object({
    name: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().default(""),
    address: z.string().default(""),
  }),
  customer_match: customerMatchSchema.default({ customer_id: null, matched_name: "", confidence: "none" }),
  explicit_price: z.number().nullable().default(null),
  recommended_status: z
    .enum(["lead", "quote", "job", "invoice"])
    .default("quote"),
  schedule: z.object({
    date: z.string().nullable().default(null),
    time_window: z.string().nullable().default(null),
  }),
  line_items: z.array(lineItemSchema).default([]),
  notes: z.string().nullable().default(null),
  warranty_flags: z.array(z.string()).default([]),
});

export type AiCaptureOutput = z.infer<typeof outputSchema>;
export type AiLineItem = z.infer<typeof lineItemSchema>;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = (await req.json()) as { text: string };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const [{ data: presets }, { data: existingCustomers }] = await Promise.all([
    admin
      .from("service_presets")
      .select("id,service_name,description,price_type,flat_rate,hourly_rate,estimated_hours,unit,tags,category")
      .eq("org_id", orgId!)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    admin
      .from("customers")
      .select("id,first_name,last_name,company_name,phone,email")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  const hasPresets = presets && presets.length > 0;

  const presetsJson = hasPresets
    ? presets.map((p) => ({
        id: p.id,
        name: p.service_name,
        description: p.description ?? "",
        unit: p.unit ?? "each",
        price:
          p.price_type === "flat"
            ? p.flat_rate
            : (p.hourly_rate ?? 0) * (p.estimated_hours ?? 1),
        tags: p.tags ?? [],
        category: p.category ?? "",
      }))
    : [];

  const customersJson = (existingCustomers ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "",
    phone: c.phone ?? "",
    email: c.email ?? "",
  }));

  const today = new Date().toISOString().slice(0, 10);

  const schema = `{
  "job_title": "string — clear professional title e.g. 'Radon Mitigation System Installation'",
  "customer": {
    "name": "string or empty string",
    "phone": "string or empty string",
    "email": "string or empty string",
    "address": "string or empty string"
  },
  "customer_match": {
    "customer_id": "uuid string from existing_customers list, or null if no match",
    "matched_name": "the name as it appears in the existing_customers list, or empty string",
    "confidence": "high | medium | none"
  },
  "explicit_price": null,
  "recommended_status": "lead | quote | job | invoice",
  "schedule": {
    "date": "YYYY-MM-DD or null",
    "time_window": "string e.g. '8am-12pm' or null"
  },
  "line_items": [
    {
      "preset_id": "uuid string or null",
      "description": "string",
      "qty": 1,
      "unit": "each | ft | hour | etc",
      "unit_price": 0,
      "needs_manual_pricing": false,
      "is_ai_estimate": false
    }
  ],
  "notes": "string or null",
  "warranty_flags": ["payment", "labor-warranty", "parts-warranty", "codes", "permits", "scope", "access", "cancellation"]
}`;

  const clientMatchRule = customersJson.length > 0
    ? `CLIENT MATCHING: Search the existing_customers list for the best match to the customer name mentioned. Apply fuzzy matching — nicknames are equivalent (Mike=Michael, Chris=Christopher, Jon=John, Bob=Robert, Bill=William, Jim=James, etc.). Match on full name similarity. Also match on phone or email if provided. Set customer_match.customer_id to the matching id from the list, customer_match.matched_name to their name, and customer_match.confidence to: "high" if it is clearly the same person (exact match or obvious nickname/abbreviation), "medium" if it is probably the same person (partial match), "none" if no reasonable match exists. If confidence is "none", set customer_id to null.`
    : `CLIENT MATCHING: No existing clients found. Set customer_match to { customer_id: null, matched_name: "", confidence: "none" }.`;

  const pricingRule = hasPresets
    ? `PRICING: IMPORTANT — if the user explicitly states a price or dollar amount (e.g. "for $1200", "1500 dollars", "at $950"), that stated price MUST be used as the unit_price and you MUST set explicit_price to that number — do NOT use the preset price instead. Only use the preset price when NO explicit price is stated by the user. When a line item matches a preset and no explicit price was given: use its id as preset_id, its price as unit_price, its unit as unit, set needs_manual_pricing to false, is_ai_estimate to false. When no preset matches and no explicit price: set preset_id to null, estimate a reasonable unit_price, set needs_manual_pricing to true, is_ai_estimate to true.`
    : `PRICING: IMPORTANT — if the user explicitly states a price or dollar amount (e.g. "for $1200", "1500 dollars"), that stated price MUST be used as unit_price and you MUST set explicit_price to that number. No service presets configured. For every line item with no explicit price, set preset_id to null, estimate a reasonable unit_price, set needs_manual_pricing to true, is_ai_estimate to true. Never leave unit_price as null.`;

  const warrantyRule = `WARRANTY FLAGS: Populate the warranty_flags array with any of these IDs that are relevant based on the job context or explicitly mentioned by the user: "payment" (payment/billing terms), "labor-warranty" (labor/workmanship warranty), "parts-warranty" (parts/materials warranty), "codes" (building code compliance), "permits" (permits required), "scope" (scope of work limits), "access" (site access), "cancellation" (cancellation policy). Include "payment" and "labor-warranty" by default for any quote or invoice. Only include "permits" if permits seem likely for the job type.`;

  const messages = buildMessages(
    {
      role: "You are an AI job intake assistant for TradeBase, a contractor CRM. Extract structured job information from a contractor's message and return it as JSON.",
      rules: [
        "Return valid JSON only — no markdown, no prose, no explanation.",
        clientMatchRule,
        pricingRule,
        warrantyRule,
        "Convert relative dates (e.g. 'next Friday', 'tomorrow') to ISO date YYYY-MM-DD relative to today.",
        "Use empty string '' for missing customer fields, not null.",
        "recommended_status: 'lead' if vague, 'quote' if pricing needed, 'job' if agreed and schedulable, 'invoice' if work is done.",
        "Use the supplied presets array to match line items. Match by name, description, tags, and category.",
      ],
      context: {
        today,
        service_presets: hasPresets ? JSON.stringify(presetsJson) : "none",
        existing_customers: customersJson.length > 0 ? JSON.stringify(customersJson) : "none",
      },
      task: "Extract job title, customer info, schedule, line items, warranty flags, a recommended status, client match, and explicit price from the input text.",
      schema,
    },
    body.text.trim()
  );

  const openai = getOpenAIClient();

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 1600,
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json(
      { error: "AI service unavailable — please try again or fill in manually" },
      { status: 503 }
    );
  }

  let parsed: AiCaptureOutput;
  try {
    parsed = outputSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      { error: "Could not parse AI response — please try again" },
      { status: 500 }
    );
  }

  return NextResponse.json(parsed);
}
