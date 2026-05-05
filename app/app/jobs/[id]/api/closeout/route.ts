import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = await req.json() as {
    warranty_title?: string;
    warranty_body?: string;
    report_id?: string | null;
    invoice_id?: string | null;
    package_data?: Record<string, unknown>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("job_closeout_packages")
    .select("id")
    .eq("job_id", jobId)
    .eq("org_id", orgId!)
    .maybeSingle();

  const row = {
    org_id: orgId!,
    job_id: jobId,
    warranty_title: body.warranty_title ?? null,
    warranty_body: body.warranty_body ?? null,
    report_id: body.report_id ?? null,
    invoice_id: body.invoice_id ?? null,
    package_data: body.package_data ?? {},
    status: "draft",
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("job_closeout_packages")
      .update(row)
      .eq("id", existing.id);
    return NextResponse.json({ ok: true, id: existing.id });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error } = await (admin as any)
    .from("job_closeout_packages")
    .insert(row)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: created.id });
}
