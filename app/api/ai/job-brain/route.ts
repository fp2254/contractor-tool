import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

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

  const openai = getOpenAIClient();

  const contextLines = [
    `Job Title: ${body.jobTitle.trim()}`,
    body.description ? `Description: ${body.description.trim()}` : null,
    body.address ? `Address: ${body.address.trim()}` : null,
    body.cityState ? `Location: ${body.cityState.trim()}` : null,
    body.notes ? `Site Notes: ${body.notes.trim()}` : null,
    body.clientHistory ? `Client History: ${body.clientHistory.trim()}` : null,
  ].filter(Boolean).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_completion_tokens: 1200,
    messages: [
      {
        role: "system",
        content: `You are Job Brain, an AI assistant for skilled tradespeople. Given a job description, return a JSON object with exactly these keys:

- "permit_likelihood": object with "verdict" (one of: "Required", "Likely Required", "Unlikely", "Not Required", "Depends on Scope") and "detail" (1-2 sentences)
- "estimated_time": object with "range" (e.g. "3-5 hours") and "factors" (1 sentence on what affects the time)
- "recommended_materials": array of 4-8 specific material strings a contractor should have on hand
- "material_checklist": array of 5-8 checklist item strings to verify before starting
- "inspection_considerations": array of 2-4 strings covering typical inspections or code points
- "permit_guidance": object with "office" (building authority type), "process" (2-3 sentence summary of typical permit process for this job type)
- "ai_suggestions": array of 2-3 actionable follow-up suggestions as strings

Be concise and practical. Tailor all answers specifically to the job title and location provided. Do not include generic filler.`,
      },
      {
        role: "user",
        content: contextLines,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
