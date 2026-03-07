import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { handleAIRequest, AiServiceError } from "@/lib/ai/handler";

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
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  try {
    const { result } = await handleAIRequest({
      feature: "job_brain",
      orgId: orgId!,
      userId: user?.id,
      promptConfig: {
        role: "You are an AI job intelligence assistant inside TradeBase, a contractor CRM. Analyze a contractor job and provide planning insights.",
        rules: [
          "Return valid JSON only — no markdown, no prose.",
          "Tailor every answer to the specific job title and location — no generic filler.",
          "estimated_install_time: a concise time range string, or null if cannot be estimated.",
          "recommended_materials: 4–8 specific items the contractor should have on hand.",
          "inspection_considerations: 2–4 practical items covering inspections or code points.",
          "material_checklist: 5–8 items to verify before starting the job.",
          "job_alerts: 1–4 important risks or considerations. Empty array if none.",
          "follow_up_suggestion: one actionable follow-up suggestion, or null.",
        ],
        context: {
          job_title: body.jobTitle.trim(),
          ...(body.description ? { description: body.description.trim() } : {}),
          ...(body.address ? { address: body.address.trim() } : {}),
          ...(body.cityState ? { location: body.cityState.trim() } : {}),
          ...(body.notes ? { site_notes: body.notes.trim() } : {}),
          ...(body.clientHistory ? { client_history: body.clientHistory.trim() } : {}),
        },
        task: "Generate job intelligence insights: estimated install time, materials, pre-job checklist, inspection considerations, alerts, and a follow-up suggestion.",
        schema: `{
  "estimated_install_time": "e.g. 3-5 hours or null",
  "recommended_materials": ["specific material"],
  "inspection_considerations": ["code point or note"],
  "material_checklist": ["pre-job checklist item"],
  "job_alerts": ["important alert or risk"],
  "follow_up_suggestion": "one actionable suggestion or null",
  "needs_review": false
}`,
      },
      input: body.jobTitle.trim(),
      schema: outputSchema,
      inputJson: { jobTitle: body.jobTitle, description: body.description, address: body.address, cityState: body.cityState },
      options: { maxTokens: 1200 },
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
