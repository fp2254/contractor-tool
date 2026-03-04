import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const outputSchema = z.object({
  customer: z.object({
    name: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().default(""),
    address: z.string().default(""),
  }),
  job: z.object({
    title: z.string().default("New Job"),
    scheduled_date: z.string().nullable().default(null),
    notes: z.string().default(""),
  }),
  quote: z.object({
    line_items: z
      .array(
        z.object({
          description: z.string(),
          qty: z.number().default(1),
          unit_price: z.number().default(0),
        })
      )
      .default([]),
    tax_rate: z.number().default(0),
    notes: z.string().default(""),
  }),
});

export type AiCaptureOutput = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = await req.json() as { text: string };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const { data: presets } = await admin
    .from("service_presets")
    .select("service_name,flat_rate,hourly_rate,price_type,estimated_hours")
    .eq("org_id", orgId!)
    .limit(10);

  const presetsText =
    presets && presets.length > 0
      ? "\n\nAvailable service presets (use these prices when applicable):\n" +
        presets
          .map((p) => {
            const price =
              p.price_type === "flat"
                ? p.flat_rate
                : (p.hourly_rate ?? 0) * (p.estimated_hours ?? 1);
            return `- ${p.service_name}: $${price}`;
          })
          .join("\n")
      : "";

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are an AI assistant for a contractor CRM called TradeBase. Today is ${today}.
Extract structured information from the contractor's job description and return ONLY valid JSON — no other text.

${presetsText}

Return this exact JSON structure:
{
  "customer": { "name": string, "phone": string, "email": string, "address": string },
  "job": { "title": string, "scheduled_date": "YYYY-MM-DD or null", "notes": string },
  "quote": {
    "line_items": [{ "description": string, "qty": number, "unit_price": number }],
    "tax_rate": number,
    "notes": string
  }
}

Rules:
- Extract any customer name, phone, email, address from the text (use "" if not found)
- Create a clear, professional job title (e.g. "Radon Mitigation System Installation")
- Generate realistic line items with fair market prices based on the trade described
- If service presets match, use those prices
- scheduled_date: convert relative dates ("next Friday", "tomorrow") to ISO date or null
- tax_rate: 0 unless mentioned
- All strings required — use "" if unknown, never null for strings`;

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
      max_completion_tokens: 1024,
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
