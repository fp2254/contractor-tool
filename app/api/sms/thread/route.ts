/**
 * GET /api/sms/thread?leadId=xxx
 * Returns the SMS conversation + messages for a given lead.
 */
import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversations } = await (admin as any)
    .from("sms_conversations")
    .select("id, status, from_number, to_number, created_at")
    .eq("org_id", orgId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!conversations?.length) {
    return NextResponse.json({ conversation: null, messages: [] });
  }

  const conv = conversations[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages } = await (admin as any)
    .from("sms_messages")
    .select("id, direction, body, sent_at")
    .eq("conversation_id", conv.id)
    .order("sent_at", { ascending: true });

  return NextResponse.json({ conversation: conv, messages: messages ?? [] });
}
