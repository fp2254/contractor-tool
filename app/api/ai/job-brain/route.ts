import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { buildMessages } from "@/lib/ai/prompt";

const outputSchema = z.object({
  estimated_install_time: z.string().nullable().default(null),
  recommended_materials: z.array(z.string()).default([]),
  inspection_considerations: z.array(z.string()).default([]),
  material_checklist: z.array(z.string()).default([]),
  job_alerts: z.array(z.string()).default([]),
  follow_up_suggestion: z.string().nullable().default(null),
  needs_review: z.boolean().default(false),
});

export type JobBrainResult = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  await ensureUserOrg();

  const body = await req.json() as {
    jobTitle: string;
    description?: string;
    address?: string;
    cityState?: string;
    notes?: string;
    clientHistory?: string;
  };

  if (!body.jobTitle?.trim()) {
    return NextResponse.json({ error: "jobTitle is required" }, { status: 400 });
  }

  const schema = `{
  "estimated_install_time": "e.g. 3-5 hours or null",
  "recommended_materials": [
    "specific material string"
  ],
  "inspection_considerations": [
    "code point or inspection note"
  ],
  "material_checklist": [
    "pre-job checklist item"
  ],
  "job_alerts": [
    "important alert or risk the contractor should know"
  ],
  "follow_up_suggestion": "one actionable follow-up suggestion string or null",
  "needs_review": false
}`;

  const messages = buildMessages(
    {
      role: "You are an AI job intelligence assistant inside TradeBase, a contractor CRM. Analyze a contractor job and provide planning insights.",
      rules: [
        "Return valid JSON only — no markdown, no prose.",
        "Tailor every answer to the specific job title and location — no generic filler.",
        "estimated_install_time: a concise time range string, or null if cannot be estimated.",
        "recommended_materials: 4–8 specific items the contractor should have on hand.",
        "inspection_considerations: 2–4 practical items covering inspections or code points.",
        "material_checklist: 5–8 items to verify before starting the job.",
        "job_alerts: 1–4 important risks or considerations the contractor should know about. Empty array if none.",
        "follow_up_suggestion: one actionable follow-up suggestion, or null.",
        "Be concise and practical.",
      ],
      context: {
        job_title: body.jobTitle.trim(),
        ...(body.description ? { description: body.description.trim() } : {}),
        ...(body.address ? { address: body.address.trim() } : {}),
        ...(body.cityState ? { location: body.cityState.trim() } : {}),
        ...(body.notes ? { site_notes: body.notes.trim() } : {}),
        ...(body.clientHistory ? { client_history: body.clientHistory.trim() } : {}),
      },
      task: "Generate job intelligence insights covering estimated install time, materials, pre-job checklist, inspection considerations, alerts, and a follow-up suggestion.",
      schema,
    },
    body.jobTitle.trim()
  );

  const openai = getOpenAIClient();

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_completion_tokens: 1200,
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  let result: JobBrainResult;
  try {
    result = outputSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
