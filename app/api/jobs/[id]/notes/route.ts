import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const admin = createAdminClient();

  const body = await req.json();
  const noteBody = String(body.body ?? "").trim();

  if (!noteBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const { data: job } = await admin
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("org_id", orgId!)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const user = await supabase.auth.getUser();

  const { error } = await admin.from("notes").insert({
    org_id: orgId!,
    entity_type: "job",
    entity_id: jobId,
    body: noteBody,
    created_by: user.data.user?.id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
