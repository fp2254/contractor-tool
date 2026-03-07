import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export async function POST(req: Request) {
  const { items } = await req.json() as {
    items: { description: string; quantity: number; unit_price: number }[];
  };

  if (!items?.length) {
    return NextResponse.json({ bullets: [] });
  }

  const client = getOpenAIClient();
  const itemList = items
    .filter((i) => i.description?.trim())
    .map((i) => `- ${i.description} (qty: ${i.quantity})`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_completion_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          "You generate clear, customer-friendly scope bullet points for trade contractor quotes. Return JSON with a 'bullets' array of short strings (4–8 items). Each bullet describes a specific task or material included in the job. Be concise and plain-English — no jargon.",
      },
      {
        role: "user",
        content: `Based on these line items, generate a scope of work bullet list:\n${itemList}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { bullets?: string[] };

  return NextResponse.json({ bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [] });
}
