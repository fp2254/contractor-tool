/**
 * PATCH /api/sms/take-over
 * Marks a conversation as handed_off so the AI goes silent.
 * Body: { conversationId: string }
 */
import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = (await req.json()) as { conversationId: string };
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  const admin = createAdminClient();

  const { error } = await (admin as any)
    .from("sms_conversations")
    .update({ status: "handed_off", updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
