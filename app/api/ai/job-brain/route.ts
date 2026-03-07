import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { buildMessages } from "@/lib/ai/prompt";

const outputSchema = z.object({
  permit_likelihood: z.object({
    verdict: z.enum(["Required", "Likely Required", "Unlikely", "Not Required", "Depends on Scope"]),
    detail: z.string(),
  }),
  estimated_time: z.object({
    range: z.string(),
    factors: z.string(),
  }),
  recommended_materials: z.array(z.string()),
  material_checklist: z.array(z.string()),
  inspection_considerations: z.array(z.string()),
  permit_guidance: z.object({
    office: z.string(),
    process: z.string(),
  }),
  ai_suggestions: z.array(z.string()),
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
  "permit_likelihood": {
    "verdict": "Required | Likely Required | Unlikely | Not Required | Depends on Scope",
    "detail": "1-2 sentence explanation"
  },
  "estimated_time": {
    "range": "e.g. 3-5 hours",
    "factors": "1 sentence on what affects the time"
  },
  "recommended_materials": ["specific material string", "..."],
  "material_checklist": ["checklist item", "..."],
  "inspection_considerations": ["code point or inspection note", "..."],
  "permit_guidance": {
    "office": "building authority type",
    "process": "2-3 sentence summary of typical permit process for this job type"
  },
  "ai_suggestions": ["actionable follow-up suggestion", "..."]
}`;

  const messages = buildMessages(
    {
      role: "You are Job Brain, an AI job planning assistant for skilled tradespeople using TradeBase. You produce concise, job-specific planning intelligence.",
      rules: [
        "Return valid JSON only — no markdown, no prose.",
        "Tailor every answer to the specific job title and location — no generic filler.",
        "recommended_materials must be 4–8 specific items a contractor should have on hand.",
        "material_checklist must be 5–8 items to verify before starting.",
        "inspection_considerations must be 2–4 items.",
        "ai_suggestions must be 2–3 actionable, job-specific follow-up suggestions.",
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
      task: "Generate a complete job intelligence report covering permits, time, materials, checklist, inspections, and follow-up suggestions.",
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
