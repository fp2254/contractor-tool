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
      max_completion_tokens: 2000,
      messages: [
        {
          role: "system",
          content: [
            "You are a pricing sheet parser for a contractor app.",
            "Extract ALL services and their prices from the image.",
            "Return ONLY valid JSON matching this exact schema:",
            '{ "services": [ { "service_name": string, "description": string, "price_type": "flat" | "hourly", "flat_rate": number | null, "hourly_rate": number | null, "unit": string, "category": string } ] }',
            "Rules:",
            "- service_name: clear, short name for the service (e.g. 'Radon Fan Install', 'Crawlspace Encapsulation')",
            "- description: brief description if visible, otherwise empty string",
            "- price_type: 'flat' if it's a fixed price, 'hourly' if it's per-hour",
            "- flat_rate: the number only (no $ sign) if flat, otherwise null",
            "- hourly_rate: the number only if hourly, otherwise null",
            "- unit: 'job', 'each', 'sqft', 'lf', 'hr', or best guess from context",
            "- category: infer from service type (e.g. 'radon', 'crawlspace', 'hvac', 'plumbing', 'general')",
            "- If a price range is shown (e.g. $800-$1200), use the lower value as flat_rate",
            "- Include every line item, package, and service you can see",
            "- Return empty services array if no services found",
          ].join(" "),
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
              text: "Extract all services and prices from this pricing sheet. Return JSON only.",
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    const result = outputSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json({ error: "Could not parse pricing sheet" }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[price-sheet-scan] OpenAI error:", err);
    return NextResponse.json({ error: "Price sheet scanning failed — please try again" }, { status: 503 });
  }
}
