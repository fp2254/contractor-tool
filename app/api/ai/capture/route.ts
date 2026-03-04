import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const lineItemSchema = z.object({
  preset_id: z.string().nullable().default(null),
  description: z.string(),
  qty: z.number().default(1),
  unit: z.string().default("each"),
  unit_price: z.number().nullable().default(null),
  needs_manual_pricing: z.boolean().default(false),
});

const outputSchema = z.object({
  job_title: z.string().default("New Job"),
  customer: z.object({
    name: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().default(""),
    address: z.string().default(""),
  }),
  recommended_status: z
    .enum(["lead", "quote", "job", "invoice"])
    .default("quote"),
  schedule: z.object({
    date: z.string().nullable().default(null),
    time_window: z.string().nullable().default(null),
  }),
  line_items: z.array(lineItemSchema).default([]),
  notes: z.string().nullable().default(null),
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

  const { data: presets } = await admin
    .from("service_presets")
    .select(
      "id,service_name,description,price_type,flat_rate,hourly_rate,estimated_hours,unit,tags,category"
    )
    .eq("org_id", orgId!)
    .order("sort_order", { ascending: true });

  const hasPresets = presets && presets.length > 0;

  const presetsJson = hasPresets
    ? presets.map((p) => {
        const price =
          p.price_type === "flat"
            ? p.flat_rate
            : (p.hourly_rate ?? 0) * (p.estimated_hours ?? 1);
        return {
          id: p.id,
          name: p.service_name,
          description: p.description ?? "",
          unit: p.unit ?? "each",
          price,
          tags: p.tags ?? [],
          category: p.category ?? "",
        };
      })
    : [];

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are an AI assistant for a contractor CRM called TradeBase. Today is ${today}.
Extract structured information from a job description and return ONLY valid JSON — no other text.

${
  hasPresets
    ? `## THIS ORG'S SERVICE PRICE SHEET
The following presets are the ONLY allowed source of pricing. You MUST use them:

${JSON.stringify(presetsJson, null, 2)}

PRICING RULES (strictly enforced):
1. Match the job description to the closest preset(s) using the name, description, tags, and category.
2. When a preset matches: use its id as preset_id, its price as unit_price, and its unit as unit.
3. When NO preset matches a needed line item: set preset_id to null, unit_price to null, and needs_manual_pricing to true.
4. NEVER invent a price. NEVER use internet averages or guesses. If there is no matching preset, the price must be null.`
    : `## NO SERVICE PRESETS CONFIGURED
This org has not set up a service price sheet yet.
For every line item, set preset_id to null, unit_price to null, and needs_manual_pricing to true.
The contractor will fill in prices manually.`
}

## OUTPUT JSON SHAPE (return exactly this structure):
{
  "job_title": "string — clear professional title e.g. 'Radon Mitigation System Installation'",
  "customer": {
    "name": "string or empty string",
    "phone": "string or empty string",
    "email": "string or empty string",
    "address": "string or empty string"
  },
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
      "unit_price": 1200,
      "needs_manual_pricing": false
    }
  ],
  "notes": "string or null"
}

## RECOMMENDED STATUS RULES:
- "lead": job is very vague, no details yet
- "quote": customer wants pricing before committing
- "job": customer has agreed and work needs to be scheduled
- "invoice": work is already done and needs to be billed

## GENERAL RULES:
- Extract customer name, phone, email, address from the description (use "" if not found)
- Convert relative dates ("next Friday", "tomorrow") to ISO date
- All string fields: use "" not null
- schedule.date and schedule.time_window: use null if not mentioned`;

  const openai = getOpenAIClient();

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: body.text.trim() },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1200,
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
