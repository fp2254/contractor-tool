import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("job_field_responses")
    .select("field_id, value")
    .eq("job_id", jobId)
    .eq("org_id", orgId!);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const body = await req.json() as {
    template_id: string;
    responses: { field_id: string; value: string }[];
  };

  if (!body.template_id || !Array.isArray(body.responses)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rows = body.responses.map(r => ({
    org_id: orgId!,
    job_id: jobId,
    template_id: body.template_id,
    field_id: r.field_id,
    value: r.value,
    created_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("job_field_responses")
    .upsert(rows, { onConflict: "job_id,field_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
