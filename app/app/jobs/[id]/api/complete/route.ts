import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { role } = await getUserOrgRole();

  // ── Fetch job ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (admin as any)
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("org_id", orgId!)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.template_id) return NextResponse.json({ error: "No template assigned" }, { status: 400 });

  const templateId = job.template_id as string;

  // ── Fetch template, fields, responses, photos ─────────────────────────────
  const [templateRes, fieldsRes, responsesRes, photosRes, customerRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_templates").select("name,required_photo_count").eq("id", templateId).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_template_fields").select("id,label,field_type,required,sort_order,options").eq("template_id", templateId).order("sort_order", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_field_responses").select("field_id,value").eq("job_id", jobId).eq("org_id", orgId!),
    admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "job").eq("entity_id", jobId).eq("org_id", orgId!),
    admin.from("customers").select("first_name,last_name,phone,email,address_line1,city,state").eq("id", job.customer_id).single(),
  ]);

  const template = templateRes.data;
  const fields: { id: string; label: string; field_type: string; required: boolean }[] = fieldsRes.data ?? [];
  const responses: { field_id: string; value: string }[] = responsesRes.data ?? [];
  const photos: { id: string; url: string; filename: string }[] = photosRes.data ?? [];
  const customer = customerRes.data;

  const responseMap = Object.fromEntries(responses.map(r => [r.field_id, r.value]));

  // ── Validate ───────────────────────────────────────────────────────────────
  const validationErrors: string[] = [];

  const requiredPhotoCount = template?.required_photo_count ?? 0;
  if (requiredPhotoCount > 0 && photos.length < requiredPhotoCount) {
    const needed = requiredPhotoCount - photos.length;
    validationErrors.push(`${needed} more photo${needed > 1 ? "s" : ""} required (${photos.length} / ${requiredPhotoCount})`);
  }

  const missingFields = fields.filter(f => f.required && !responseMap[f.id]?.trim());
  for (const f of missingFields) {
    validationErrors.push(`"${f.label}" is required`);
  }

  if (validationErrors.length > 0) {
    return NextResponse.json({ errors: validationErrors }, { status: 422 });
  }

  // ── Determine new status ───────────────────────────────────────────────────
  const newStatus = isOwnerOrAdmin(role) ? "completed" : "submitted_for_review";

  // ── Update job status ──────────────────────────────────────────────────────
  const statusUpdate: Record<string, string | null> = { status: newStatus };
  if (newStatus === "completed") statusUpdate.completed_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("jobs").update(statusUpdate).eq("id", jobId).eq("org_id", orgId!);

  // ── Build report data snapshot ─────────────────────────────────────────────
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Unknown";
  const reportData = {
    job_id: jobId,
    job_title: job.job_title,
    job_address: job.address ?? null,
    scheduled_date: job.scheduled_date ?? null,
    completed_at: new Date().toISOString(),
    customer_name: customerName,
    customer_phone: customer?.phone ?? null,
    customer_email: customer?.email ?? null,
    customer_city: customer?.city ?? null,
    customer_state: customer?.state ?? null,
    technician_user_id: user?.id ?? null,
    template_name: template?.name ?? "",
    field_responses: fields.map(f => ({
      label: f.label,
      field_type: f.field_type,
      value: responseMap[f.id] ?? "",
    })),
    photos: photos.map(p => ({ id: p.id, url: p.url, filename: p.filename })),
    status: newStatus,
  };

  // ── Create job report record ───────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report, error: reportErr } = await (admin as any)
    .from("job_reports")
    .insert({
      org_id: orgId!,
      job_id: jobId,
      template_id: templateId,
      technician_id: user?.id ?? null,
      customer_id: job.customer_id,
      report_data: reportData,
      generated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (reportErr) {
    console.error("job_report insert error:", reportErr);
  }

  return NextResponse.json({
    ok: true,
    status: newStatus,
    reportId: report?.id ?? null,
  });
}
