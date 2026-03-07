import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { buildMessages } from "@/lib/ai/prompt";

const outputSchema = z.object({
  summary: z.string(),
  top_actions: z.array(z.string()).default([]),
  priority_level: z.enum(["low", "medium", "high"]),
  needs_review: z.boolean().default(false),
});

export type OpsSummaryResult = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  await ensureUserOrg();

  const body = await req.json() as {
    open_quotes_count: number;
    overdue_invoices_count: number;
    outstanding_amount: number;
    jobs_today_count: number;
    unscheduled_jobs_count: number;
    new_leads_count: number;
  };

  const schema = `{
  "summary": "2-3 sentence plain-English summary of today's priorities",
  "top_actions": [
    "actionable next-step string — specific and short"
  ],
  "priority_level": "low | medium | high",
  "needs_review": false
}`;

  const messages = buildMessages(
    {
      role: "You are an AI operations assistant inside TradeBase, a contractor CRM. Summarize the contractor's daily priorities using the provided business data.",
      rules: [
        "Return valid JSON only — no markdown, no prose.",
        "Prioritize money (overdue invoices, outstanding balance) and urgent actions first.",
        "top_actions must be 2–5 specific, actionable items based only on the supplied numbers.",
        "Do not invent tasks — base everything on the provided counts.",
        "summary must be 2–3 plain-English sentences, motivating but factual.",
        "priority_level: 'high' if overdue invoices > 0 or outstanding > $1000; 'medium' if open quotes or unscheduled jobs; 'low' otherwise.",
      ],
      context: {
        open_quotes_needing_followup: body.open_quotes_count,
        overdue_invoices: body.overdue_invoices_count,
        outstanding_invoice_amount: `$${body.outstanding_amount.toLocaleString()}`,
        jobs_today: body.jobs_today_count,
        unscheduled_jobs: body.unscheduled_jobs_count,
        new_leads_not_contacted: body.new_leads_count,
      },
      task: "Generate a daily operations summary and 2–5 suggested next actions based on the business data provided.",
      schema,
    },
    "Generate daily ops summary"
  );

  const openai = getOpenAIClient();

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
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

  let result: OpsSummaryResult;
  try {
    result = outputSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
