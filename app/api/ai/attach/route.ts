import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json() as {
    ai_run_id: string;
    entity_type: string;
    entity_id: string;
    title?: string;
    note?: string;
    is_pinned?: boolean;
  };

  if (!body.ai_run_id || !body.entity_type || !body.entity_id) {
    return NextResponse.json({ error: "ai_run_id, entity_type, entity_id required" }, { status: 400 });
  }

  const VALID_TYPES = ["lead", "customer", "job", "quote", "invoice"];
  if (!VALID_TYPES.includes(body.entity_type)) {
    return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
  }

  // Verify the ai_run belongs to this org
  const { data: run } = await admin
    .from("ai_runs" as "orgs")
    .select("id,org_id")
    .eq("id", body.ai_run_id)
    .eq("org_id", orgId!)
    .maybeSingle() as { data: { id: string; org_id: string } | null };

  if (!run) {
    return NextResponse.json({ error: "AI run not found" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("ai_attachments" as "orgs")
    .insert({
      org_id: orgId!,
      ai_run_id: body.ai_run_id,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      title: body.title ?? null,
      note: body.note ?? null,
      is_pinned: body.is_pinned ?? false,
      created_by: user?.id ?? null,
    } as never)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: (data as { id: string }).id });
}
