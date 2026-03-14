import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

export const dynamic = "force-dynamic";

const serviceSchema = z.object({
  service_name: z.string().default(""),
  description: z.string().default(""),
  price_type: z.enum(["flat", "hourly"]).default("flat"),
  flat_rate: z.number().nullable().default(null),
  hourly_rate: z.number().nullable().default(null),
  unit: z.string().default("job"),
  category: z.string().default(""),
});

const outputSchema = z.object({
  services: z.array(serviceSchema).default([]),
});

export type PriceSheetScanResult = z.infer<typeof outputSchema>;
export type ScannedService = z.infer<typeof serviceSchema>;

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();

  // Try direct parse first
  try { return JSON.parse(trimmed); } catch { /* fall through */ }

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try { return JSON.parse(fenced); } catch { /* fall through */ }

  // Try to extract the first {...} block
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    try { return JSON.parse(trimmed.slice(first, last + 1)); } catch { /* fall through */ }
  }

  return null;
}

export async function POST(req: Request) {
  await ensureUserOrg();

  const { image_data_url } = await req.json() as { image_data_url?: string };
  if (!image_data_url?.startsWith("data:image")) {
    return NextResponse.json({ error: "image_data_url is required" }, { status: 400 });
  }

  const client = getOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            'You are a pricing sheet parser for a contractor app. ' +
            'Extract every service/line item and its price from the image. ' +
            'You MUST respond with ONLY a valid JSON object, no prose, no markdown. ' +
            'Schema: {"services":[{"service_name":"string","description":"string","price_type":"flat","flat_rate":number_or_null,"hourly_rate":number_or_null,"unit":"job","category":"string"}]} ' +
            'Rules: ' +
            'service_name = short readable name (e.g. "Radon Fan Install"). ' +
            'price_type = "flat" for fixed prices, "hourly" for per-hour rates. ' +
            'flat_rate / hourly_rate = numeric value only, no $ sign. ' +
            'For price ranges use the lower number. ' +
            'unit = "job", "each", "sqft", "lf", "hr", "ft", or best guess. ' +
            'category = infer from context (e.g. "radon", "crawlspace", "hvac", "general"). ' +
            'Include EVERY row you can see. Return {"services":[]} if none found.',
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image_data_url, detail: "high" },
            },
            {
              type: "text",
              text: 'Extract all services and prices from this pricing sheet. Respond with JSON only — no explanation, no markdown.',
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    console.log("[price-sheet-scan] raw response length:", raw.length);

    const parsed = extractJson(raw);
    if (parsed === null) {
      console.error("[price-sheet-scan] could not extract JSON from:", raw.slice(0, 500));
      return NextResponse.json({ error: "Could not read pricing sheet — please try a clearer photo" }, { status: 500 });
    }

    const result = outputSchema.safeParse(parsed);
    if (!result.success) {
      console.error("[price-sheet-scan] schema validation failed:", result.error.message);
      return NextResponse.json({ error: "Could not parse pricing sheet structure" }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[price-sheet-scan] OpenAI error:", err);
    return NextResponse.json({ error: "Price sheet scanning failed — please try again" }, { status: 503 });
  }
}
