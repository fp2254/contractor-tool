import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient } from "@/lib/openai";
import { buildMessages } from "@/lib/ai/prompt";

const lineItemSchema = z.object({
  description: z.string(),
  qty: z.number().default(1),
  unit_price: z.number().default(0),
  preset_id: z.string().nullable().default(null),
});

const outputSchema = z.object({
  customer_name: z.string().default(""),
  customer_phone: z.string().default(""),
  customer_address: z.string().default(""),
  job_title: z.string().default("New Job"),
  scheduled_date: z.string().default(""),
  notes: z.string().default(""),
  line_items: z.array(lineItemSchema).default([]),
});

export type VoiceExtracted = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = await req.json();
  const transcript = String(body.transcript ?? "").trim();

  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  const { data: presets } = await admin
    .from("service_presets")
    .select("id,service_name,description,price_type,flat_rate,hourly_rate,estimated_hours,tags,category")
    .eq("org_id", orgId!)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const hasPresets = presets && presets.length > 0;

  const presetsText = hasPresets
    ? presets
        .map(
          (p) =>
            `id=${p.id} name="${p.service_name}" price=${
              p.price_type === "flat"
                ? p.flat_rate
                : (p.hourly_rate ?? 0) * (p.estimated_hours ?? 1)
            } tags="${(p.tags ?? []).join(",")}" category="${p.category ?? ""}"`
        )
        .join("\n")
    : "none";

  const today = new Date().toISOString().slice(0, 10);

  const schema = `{
  "customer_name": "full name as spoken or empty string",
  "customer_phone": "phone number if mentioned or empty string",
  "customer_address": "street address if mentioned or empty string",
  "job_title": "short job title, 5 words max",
  "scheduled_date": "YYYY-MM-DD if a date was mentioned, else empty string",
  "notes": "any extra details not captured elsewhere",
  "line_items": [
    {
      "description": "string",
      "qty": 1,
      "unit_price": 0,
      "preset_id": "matching preset id or null"
    }
  ]
}`;

  const messages = buildMessages(
    {
      role: "You are a voice-to-job parser for TradeBase, a contractor CRM. Convert a contractor's spoken job description into structured job data.",
      rules: [
        "Return valid JSON only — no markdown, no prose.",
        "Resolve relative dates ('Friday', 'next Monday', 'tomorrow') to ISO date YYYY-MM-DD relative to today.",
        "Use empty string '' for missing fields — never null for string fields.",
        "Match line items to service presets by name, description, tags, and category when possible.",
        "When a preset matches, use its id as preset_id and its price as unit_price.",
        "If a specific price was spoken by the contractor, use that price instead of the preset price.",
        "If no price is known and no preset matches, use 0 for unit_price.",
        "Do not invent customer details not mentioned in the transcript.",
      ],
      context: {
        today,
        service_presets: presetsText,
      },
      task: "Parse the spoken transcript into structured job fields.",
      schema,
    },
    transcript
  );

  const openai = getOpenAIClient();

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_completion_tokens: 800,
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  let extracted: VoiceExtracted;
  try {
    extracted = outputSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json({ transcript, extracted });
}
