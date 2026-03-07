import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { handleAIRequest, AiServiceError } from "@/lib/ai/handler";

const outputSchema = z.object({
  clean_note: z.string(),
  short_summary: z.string().nullable().default(null),
  needs_review: z.boolean().default(false),
});

export type NoteSummaryResult = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json() as {
    raw_notes: string;
    job_title?: string;
    client_name?: string;
  };

  if (!body.raw_notes?.trim()) {
    return NextResponse.json({ error: "raw_notes is required" }, { status: 400 });
  }

  try {
    const { result } = await handleAIRequest({
      feature: "note_summary",
      orgId: orgId!,
      userId: user?.id,
      promptConfig: {
        role: "You are an AI job note writer inside TradeBase, a contractor CRM. Convert rough contractor notes into clean professional job documentation.",
        rules: [
          "Return valid JSON only — no markdown, no prose.",
          "Preserve all factual information from the raw notes — do not invent or omit facts.",
          "clean_note: rewrite into complete professional sentences, organized clearly.",
          "short_summary: a single sentence capturing the most important point, or null if notes are too brief.",
          "Do not add opinions, recommendations, or information not in the original notes.",
          "Keep the tone neutral and factual.",
        ],
        context: {
          raw_notes: body.raw_notes.trim(),
          ...(body.job_title ? { job_title: body.job_title.trim() } : {}),
          ...(body.client_name ? { client_name: body.client_name.trim() } : {}),
        },
        task: "Rewrite the rough notes into a clean professional summary suitable for a job record.",
        schema: `{
  "clean_note": "Full rewritten note — professional, clear, preserving all important facts",
  "short_summary": "One-sentence summary or null",
  "needs_review": false
}`,
      },
      input: body.raw_notes.trim(),
      schema: outputSchema,
      inputJson: body as Record<string, unknown>,
      options: { maxTokens: 500 },
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
