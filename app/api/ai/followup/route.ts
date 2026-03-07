import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { handleAIRequest, AiServiceError } from "@/lib/ai/handler";

export type FollowUpResult = z.infer<typeof outputSchema>;

const outputSchema = z.object({
  sms: z.string(),
  email_subject: z.string(),
  email_body: z.string(),
  needs_review: z.boolean().default(false),
});

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  const [{ data: orgSettings }, { data: orgRow }] = await Promise.all([
    admin.from("org_settings").select("dba_name").eq("org_id", orgId!).maybeSingle(),
    admin.from("orgs").select("name").eq("id", orgId!).single(),
  ]);

  const businessName =
    (orgSettings as Record<string, unknown> | null)?.dba_name as string ??
    orgRow?.name ?? "Your Contractor";

  try {
    const { result } = await handleAIRequest({
      feature: "follow_up_generator",
      orgId: orgId!,
      userId: user?.id,
      promptConfig: {
        role: "You are a contractor follow-up assistant inside TradeBase, a contractor CRM. Write short, polite, professional follow-up drafts for quotes and invoices.",
        rules: [
          "Return valid JSON only — no markdown, no prose outside JSON values.",
          "Keep messages concise — do not be pushy or aggressive.",
          "sms must be 160 characters or fewer.",
          "email_body must be plain text — no HTML, no bullet points, no headers.",
          "Use only the provided details — do not invent job specifics.",
          "Use a friendly but professional tone.",
          "Always include the business name in the SMS.",
          "Email body: greeting, brief reminder, and a call to action.",
        ],
        context: {
          business_name: businessName,
          client_name: body.client_name ?? "there",
          record_type: body.record_type,
          record_title: body.record_title ?? body.record_type,
          days_since_sent: body.days_since_sent ?? 0,
          ...(body.amount ? { amount: `$${body.amount.toLocaleString()}` } : {}),
        },
        task: "Write a follow-up message draft — both SMS (≤160 chars) and email formats.",
        schema: `{
  "sms": "Short SMS text ≤160 chars — conversational, polite, includes business name",
  "email_subject": "Email subject line",
  "email_body": "Email body — 2-4 short paragraphs, plain text, professional but friendly",
  "needs_review": false
}`,
      },
      input: `Follow up on a ${body.record_type} for ${body.client_name ?? "a client"}`,
      schema: outputSchema,
      inputJson: body as Record<string, unknown>,
      options: { maxTokens: 600 },
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
