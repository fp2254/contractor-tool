import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { buildMessages } from "@/lib/ai/prompt";

const outputSchema = z.object({
  bullets: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  await ensureUserOrg();

  const { items } = await req.json() as {
    items: { description: string; quantity: number; unit_price: number }[];
  };

  if (!items?.length) {
    return NextResponse.json({ bullets: [] });
  }

  const filled = items.filter((i) => i.description?.trim());
  if (!filled.length) {
    return NextResponse.json({ bullets: [] });
  }

  const itemList = filled
    .map((i) => `- ${i.description.trim()} (qty: ${i.quantity})`)
    .join("\n");

  const schema = `{
  "bullets": [
    "plain-English scope item string",
    "..."
  ]
}`;

  const messages = buildMessages(
    {
      role: "You are a scope writer for TradeBase, a contractor CRM. Generate customer-friendly scope of work bullet points for contractor quotes.",
      rules: [
        "Return valid JSON only — no markdown, no prose.",
        "Generate 4–8 bullet points.",
        "Each bullet must be a short, plain-English description of a specific task or material included.",
        "No technical jargon — write for a homeowner audience.",
        "Base bullets only on the supplied line items — do not invent work not represented.",
        "Do not include pricing in the bullets.",
      ],
      context: {
        line_items: itemList,
      },
      task: "Generate a scope of work bullet list for a customer-facing quote based on the supplied line items.",
      schema,
    },
    itemList
  );

  const client = getOpenAIClient();

  let raw: string;
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_completion_tokens: 400,
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  let result: { bullets: string[] };
  try {
    result = outputSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json({ bullets: result.bullets });
}
