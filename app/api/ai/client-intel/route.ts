import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { handleAIRequest, AiServiceError } from "@/lib/ai/handler";

const outputSchema = z.object({
  insight_summary: z.string(),
  flags: z.array(z.string()).default([]),
  recommended_next_action: z.string().nullable().default(null),
  needs_review: z.boolean().default(false),
});

export type ClientIntelResult = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json() as {
    client_name: string;
    lifetime_value: number;
    outstanding_balance: number;
    completed_jobs: number;
    quotes_pending: number;
    last_job_date?: string | null;
  };

  if (!body.client_name?.trim()) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
  }

  try {
    const { result } = await handleAIRequest({
      feature: "client_intelligence",
      orgId: orgId!,
      userId: user?.id,
      promptConfig: {
        role: "You are an AI client intelligence assistant inside TradeBase, a contractor CRM. Summarize important facts about a client relationship to help the contractor take action.",
        rules: [
          "Return valid JSON only — no markdown, no prose.",
          "Focus on value, risk, and the recommended next action.",
          "Use only the supplied client activity data — do not invent facts.",
          "flags: 1–3 specific risks or opportunities. Empty array if none.",
          "insight_summary: 2–3 sentences covering the client's value and current status.",
          "recommended_next_action: one specific, actionable suggestion, or null.",
        ],
        context: {
          client_name: body.client_name.trim(),
          lifetime_value: `$${body.lifetime_value.toLocaleString()}`,
          outstanding_balance: `$${body.outstanding_balance.toLocaleString()}`,
          completed_jobs: body.completed_jobs,
          quotes_pending: body.quotes_pending,
          last_job_date: body.last_job_date ?? "unknown",
        },
        task: "Summarize key client insights including value, risk flags, and a recommended next action.",
        schema: `{
  "insight_summary": "2-3 sentence summary of this client relationship",
  "flags": ["specific risk or opportunity string"],
  "recommended_next_action": "one concrete next-step string or null",
  "needs_review": false
}`,
      },
      input: body.client_name.trim(),
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
