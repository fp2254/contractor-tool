import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  description: z.string().default(""),
  quantity: z.number().default(1),
  unit_price: z.number().default(0),
  total: z.number().default(0),
});

const outputSchema = z.object({
  vendor: z.string().default(""),
  date: z.string().default(""),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  total: z.number().default(0),
  items: z.array(itemSchema).default([]),
});

export type ReceiptScanResult = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  await ensureUserOrg();

  const { image_data_url } = await req.json() as { image_data_url?: string };
  if (!image_data_url?.startsWith("data:image")) {
    return NextResponse.json({ error: "image_data_url is required" }, { status: 400 });
  }

  const client = getOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
      messages: [
        {
          role: "system",
          content: [
            "You are a receipt parser for a contractor app. Extract structured data from supply/material receipts.",
            "Return ONLY valid JSON with this schema:",
            "{ vendor: string, date: string (YYYY-MM-DD or empty), subtotal: number, tax: number, total: number,",
            "  items: [{ description: string, quantity: number, unit_price: number, total: number }] }",
            "For numbers, return 0 if not found. For date, return empty string if not visible.",
            "Extract ALL line items visible on the receipt.",
            "Do not include tax or subtotal rows as line items — only supply/material line items.",
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
              text: "Extract all receipt data. Return JSON only.",
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
      return NextResponse.json({ error: "Could not parse receipt data" }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[receipt-scan] OpenAI error:", err);
    return NextResponse.json({ error: "Receipt scanning failed — please try again" }, { status: 503 });
  }
}
