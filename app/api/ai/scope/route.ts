import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { handleAIRequest, AiServiceError } from "@/lib/ai/handler";

const outputSchema = z.object({
  bullets: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { items } = await req.json() as {
    items: { description: string; quantity: number; unit_price: number }[];
  };

  if (!items?.length) return NextResponse.json({ bullets: [] });

  const filled = items.filter((i) => i.description?.trim());
  if (!filled.length) return NextResponse.json({ bullets: [] });

  const itemList = filled
    .map((i) => `- ${i.description.trim()} (qty: ${i.quantity})`)
    .join("\n");

  try {
    const { result } = await handleAIRequest({
      feature: "scope_generator",
      orgId: orgId!,
      userId: user?.id,
      promptConfig: {
        role: "You are a scope writer for TradeBase, a contractor CRM. Generate customer-friendly scope of work bullet points for contractor quotes.",
        rules: [
          "Return valid JSON only — no markdown, no prose.",
          "Generate 4–8 bullet points.",
          "Each bullet: short, plain-English description of a specific task or material included.",
          "No technical jargon — write for a homeowner audience.",
          "Base bullets only on the supplied line items — do not invent work.",
          "Do not include pricing in the bullets.",
        ],
        context: { line_items: itemList },
        task: "Generate a scope of work bullet list for a customer-facing quote based on the supplied line items.",
        schema: `{ "bullets": ["plain-English scope item string"] }`,
      },
      input: itemList,
      schema: outputSchema,
      inputJson: { items: filled.map((i) => i.description) },
      options: { maxTokens: 400 },
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
