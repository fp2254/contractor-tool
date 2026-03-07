import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { buildMessages } from "@/lib/ai/prompt";

const outputSchema = z.object({
  clean_note: z.string(),
  short_summary: z.string().nullable().default(null),
  needs_review: z.boolean().default(false),
});

export type NoteSummaryResult = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  await ensureUserOrg();

  const body = await req.json() as {
    raw_notes: string;
    job_title?: string;
    client_name?: string;
  };

  if (!body.raw_notes?.trim()) {
    return NextResponse.json({ error: "raw_notes is required" }, { status: 400 });
  }

  const schema = `{
  "clean_note": "Full rewritten note — professional, clear, preserving all important facts",
  "short_summary": "One-sentence summary suitable for a list view, or null",
  "needs_review": false
}`;

  const messages = buildMessages(
    {
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
      schema,
    },
    body.raw_notes.trim()
  );

  const openai = getOpenAIClient();

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  let result: NoteSummaryResult;
  try {
    result = outputSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
