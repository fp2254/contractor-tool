import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient } from "@/lib/openai";
import { buildMessages } from "@/lib/ai/prompt";

const outputSchema = z.object({
  sms: z.string(),
  email_subject: z.string(),
  email_body: z.string(),
  needs_review: z.boolean().default(false),
});

export type FollowUpResult = z.infer<typeof outputSchema>;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = await req.json() as {
    record_type: "quote" | "invoice";
    record_id: string;
    client_name?: string;
    record_title?: string;
    days_since_sent?: number;
    amount?: number;
  };

  if (!body.record_type || !body.record_id) {
    return NextResponse.json({ error: "record_type and record_id are required" }, { status: 400 });
  }

  const { data: org } = await admin
    .from("org_settings")
    .select("dba_name")
    .eq("org_id", orgId!)
    .maybeSingle();
  const { data: orgRow } = await admin
    .from("orgs")
    .select("name")
    .eq("id", orgId!)
    .single();

  const businessName = (org as Record<string, unknown> | null)?.dba_name as string
    ?? orgRow?.name
    ?? "Your Contractor";

  const schema = `{
  "sms": "Short SMS text (max 160 chars) — conversational, polite, includes business name",
  "email_subject": "Email subject line string",
  "email_body": "Email body — 2-4 short paragraphs, professional but friendly, no HTML",
  "needs_review": false
}`;

  const messages = buildMessages(
    {
      role: "You are a contractor follow-up assistant inside TradeBase, a contractor CRM. Write short, polite, professional follow-up drafts for quotes and invoices.",
      rules: [
        "Return valid JSON only — no markdown, no prose outside the JSON values.",
        "Keep messages concise — do not be pushy or aggressive.",
        "sms must be 160 characters or fewer.",
        "email_body must be plain text — no HTML, no bullet points, no headers.",
        "Use only the provided details — do not invent job specifics.",
        "Use a friendly but professional tone.",
        "Always include the business name in the SMS.",
        "Email body should have a greeting, a brief reminder, and a call to action.",
      ],
      context: {
        business_name: businessName,
        client_name: body.client_name ?? "there",
        record_type: body.record_type,
        record_title: body.record_title ?? body.record_type,
        days_since_sent: body.days_since_sent ?? 0,
        ...(body.amount ? { amount: `$${body.amount.toLocaleString()}` } : {}),
      },
      task: "Write a follow-up message draft — both SMS and email formats.",
      schema,
    },
    `Follow up on a ${body.record_type} for ${body.client_name ?? "a client"}`
  );

  const openai = getOpenAIClient();

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_completion_tokens: 600,
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  let result: FollowUpResult;
  try {
    result = outputSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
