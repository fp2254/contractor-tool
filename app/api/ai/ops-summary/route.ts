import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { handleAIRequest, AiServiceError } from "@/lib/ai/handler";

const outputSchema = z.object({
  summary: z.string(),
  top_actions: z.array(z.string()).default([]),
  priority_level: z.enum(["low", "medium", "high"]),
  needs_review: z.boolean().default(false),
});

export type OpsSummaryResult = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json() as {
    open_quotes_count: number;
    overdue_invoices_count: number;
    outstanding_amount: number;
    jobs_today_count: number;
    unscheduled_jobs_count: number;
    new_leads_count: number;
  };

  const inputSummary = `${body.open_quotes_count} open quotes, ${body.overdue_invoices_count} overdue invoices, ${body.jobs_today_count} jobs today`;

  try {
    const { result } = await handleAIRequest({
      feature: "daily_ops_summary",
      orgId: orgId!,
      userId: user?.id,
      promptConfig: {
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
        schema: `{
  "summary": "2-3 sentence plain-English summary of today's priorities",
  "top_actions": ["actionable next-step string — specific and short"],
  "priority_level": "low | medium | high",
  "needs_review": false
}`,
      },
      input: inputSummary,
      schema: outputSchema,
      inputJson: body as Record<string, unknown>,
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
