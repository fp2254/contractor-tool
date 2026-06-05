import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PermitAssistant } from "@/components/PermitAssistant";
import { EntityAiSection, type AiAttachment } from "@/components/EntityAiSection";
import { JobBrain } from "@/components/JobBrain";
import { JobDetailsSection, type TemplateField, type FieldResponse } from "@/components/JobDetailsSection";
import { JobCompleteButton } from "@/components/JobCompleteButton";
import { JobReviewPanel } from "@/components/JobReviewPanel";
import { JobTemplateAssigner } from "@/components/JobTemplateAssigner";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import { JobScheduleModal } from "@/components/JobScheduleModal";
import { logActivity } from "@/lib/activity";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  submitted_for_review: "bg-purple-100 text-purple-700",
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  submitted_for_review: "Awaiting Review",
};

function calcNextDate(fromDate: string, rule: string): string | null {
  const d = new Date(fromDate + "T12:00:00");
  switch (rule) {
    case "daily":     d.setDate(d.getDate() + 1); break;
    case "weekly":    d.setDate(d.getDate() + 7); break;
    case "biweekly":  d.setDate(d.getDate() + 14); break;
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    default: return null;
  }
  return d.toISOString().slice(0, 10);
}

async function updateStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const update: Record<string, string | null> = { status };
  if (status === "in_progress") update.started_at = new Date().toISOString();
  if (status === "completed") update.completed_at = new Date().toISOString();
  await admin.from("jobs").update(update).eq("id", id).eq("org_id", orgId!);

  void logActivity({
    orgId: orgId!,
    entityType: "job",
    entityId: id,
    action: "status_changed",
    description: `Job status changed to ${status.replace(/_/g, " ")}`,
  });

  // Auto-create next occurrence for recurring jobs
  if (status === "completed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: job } = await (admin as any)
      .from("jobs")
      .select("is_recurring,recurrence_rule,recurrence_end_date,scheduled_date,job_title,customer_id,address,notes,template_id")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (job?.is_recurring && job.recurrence_rule && job.scheduled_date) {
      const nextDate = calcNextDate(job.scheduled_date, job.recurrence_rule);
      const withinRange = nextDate
        ? !job.recurrence_end_date || nextDate <= job.recurrence_end_date
        : false;

      if (nextDate && withinRange) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("jobs").insert({
          org_id: orgId!,
          customer_id: job.customer_id,
          job_title: job.job_title,
          status: "scheduled",
          scheduled_date: nextDate,
          address: job.address ?? null,
          notes: job.notes ?? null,
          template_id: job.template_id ?? null,
          is_recurring: true,
          recurrence_rule: job.recurrence_rule,
          recurrence_end_date: job.recurrence_end_date ?? null,
          recurrence_parent_id: id,
        });
      }
    }
  }

  revalidatePath(`/app/jobs/${id}`);
  revalidatePath("/app/jobs");
  revalidatePath("/app/schedule");
}

async function stopRecurring(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  await admin.from("jobs").update({ is_recurring: false, recurrence_rule: null, recurrence_end_date: null }).eq("id", id).eq("org_id", orgId!);
  revalidatePath(`/app/jobs/${id}`);
}

async function addNote(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const body = String(formData.get("body"));
  if (!body.trim()) return;
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();
  await admin.from("notes").insert({
    org_id: orgId!,
    entity_type: "job",
    entity_id: id,
    body: body.trim(),
    created_by: user.data.user?.id ?? null,
  });
  revalidatePath(`/app/jobs/${id}`);
}

async function createInvoiceFromJob(formData: FormData) {
  "use server";
  const jobId = String(formData.get("id"));
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: job } = await admin.from("jobs").select("customer_id,job_title,quote_id,invoice_id").eq("id", jobId).eq("org_id", orgId!).single();
  if (!job) return;

  // Server-side duplicate guard — if invoice already exists, redirect to it
  if (job.invoice_id) {
    redirect(`/app/invoices/${job.invoice_id}`);
    return;
  }

  let amount = 0;
  let items: { description: string; quantity: number; unit_price: number; total_price: number }[] = [];
  let warrantyText: string | null = null;

  if (job.quote_id) {
    const [{ data: qItems }, { data: qWarrantyNotes }] = await Promise.all([
      admin.from("quote_items").select("*").eq("quote_id", job.quote_id).eq("org_id", orgId!),
      admin.from("notes").select("body")
        .eq("entity_type", "quote").eq("entity_id", job.quote_id).eq("org_id", orgId!)
        .like("body", "__warranty__%").limit(1),
    ]);
    items = (qItems ?? []).map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price }));
    amount = items.reduce((s, i) => s + i.total_price, 0);
    const qw = (qWarrantyNotes ?? [])[0];
    if (qw) warrantyText = String(qw.body);
  }

  const { data: org } = await admin.from("orgs").select("default_payment_terms_days").eq("id", orgId!).single();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (org?.default_payment_terms_days ?? 14));

  const { data: invoice } = await admin.from("invoices").insert({
    org_id: orgId!,
    customer_id: job.customer_id,
    job_id: jobId,
    status: "unpaid",
    total_amount: amount,
    invoice_number: `INV-${Date.now()}`,
    due_date: dueDate.toISOString(),
    created_by_user: user.data.user?.id ?? null,
  }).select("id").single();

  if (!invoice) return;

  const insertOps: Promise<unknown>[] = [];
  if (items.length > 0) {
    insertOps.push(admin.from("invoice_items").insert(items.map(i => ({ ...i, org_id: orgId!, invoice_id: invoice.id }))));
  }
  if (warrantyText) {
    insertOps.push(admin.from("notes").insert({
      org_id: orgId!,
      entity_type: "invoice",
      entity_id: invoice.id,
      body: warrantyText,
      created_by: user.data.user?.id ?? null,
    }));
  }
  insertOps.push(admin.from("jobs").update({ invoice_id: invoice.id }).eq("id", jobId).eq("org_id", orgId!));
  await Promise.all(insertOps);

  redirect(`/app/invoices/${invoice.id}`);
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: job }, { data: notes }, { data: jobPhotos }] = await Promise.all([
    admin.from("jobs").select("*").eq("id", id).eq("org_id", orgId!).maybeSingle(),
    admin.from("notes").select("*").eq("entity_type", "job").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }).limit(20),
    admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "job").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }),
  ]);

  if (!job) return notFound();

  // Pull in photos from linked quote and invoice so the whole workflow shares photos
  const relatedPhotoFetches = await Promise.all([
    job.quote_id
      ? admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "quote").eq("entity_id", job.quote_id).eq("org_id", orgId!).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    job.invoice_id
      ? admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "invoice").eq("entity_id", job.invoice_id).eq("org_id", orgId!).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const photos = [
    ...(jobPhotos ?? []),
    ...(relatedPhotoFetches[0].data ?? []),
    ...(relatedPhotoFetches[1].data ?? []),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: aiAttachmentsRaw } = await (admin as any)
    .from("ai_attachments")
    .select("id, title, note, is_pinned, created_at, ai_runs(id, feature, input_text, output_json, output_text, created_at)")
    .eq("org_id", orgId!)
    .eq("entity_type", "job")
    .eq("entity_id", id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  const aiAttachments: AiAttachment[] = aiAttachmentsRaw ?? [];

  const [{ data: customer }, { data: clientInvoices }, { data: clientJobs }] = await Promise.all([
    admin.from("customers").select("first_name,last_name,phone,city,state").eq("id", job.customer_id).single(),
    admin.from("invoices").select("status").eq("customer_id", job.customer_id).eq("org_id", orgId!),
    admin.from("jobs").select("id,status").eq("customer_id", job.customer_id).eq("org_id", orgId!),
  ]);

  // Phase 2 + 3 + template assigner: template fields + responses + role
  const { role: userRole } = await getUserOrgRole();
  const canReview = isOwnerOrAdmin(userRole);
  let templateFields: TemplateField[] = [];
  let fieldResponses: FieldResponse[] = [];
  let templateName = "";
  let requiredPhotoCount = 0;

  // Fetch available templates for Owner/Admin (for the assigner dropdown)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const availableTemplates: { id: string; name: string }[] = canReview
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((await (admin as any)
        .from("job_templates")
        .select("id,name")
        .eq("org_id", orgId!)
        .eq("is_active", true)
        .order("name", { ascending: true })).data ?? [])
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((job as any).template_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templateId = (job as any).template_id as string;
    const [templateRes, fieldsRes, responsesRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("job_templates").select("name,required_photo_count").eq("id", templateId).single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("job_template_fields").select("id,label,field_type,required,sort_order,options").eq("template_id", templateId).order("sort_order", { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("job_field_responses").select("field_id,value").eq("job_id", id).eq("org_id", orgId!),
    ]);
    templateName = templateRes.data?.name ?? "";
    requiredPhotoCount = templateRes.data?.required_photo_count ?? 0;
    templateFields = (fieldsRes.data ?? []) as TemplateField[];
    fieldResponses = (responsesRes.data ?? []) as FieldResponse[];
  }

  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Unknown";
  const cityState = [customer?.city, customer?.state].filter(Boolean).join(", ") || null;

  const jobAlerts: string[] = [];
  const overdueCount = clientInvoices?.filter(i => i.status === "overdue").length ?? 0;
  if (overdueCount > 0) jobAlerts.push(`${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} for this client`);
  const completedJobCount = clientJobs?.filter(j => j.status === "completed").length ?? 0;
  if (completedJobCount > 0) jobAlerts.push(`${completedJobCount} previous job${completedJobCount > 1 ? "s" : ""} on record`);
  if (notes && notes.length > 0) jobAlerts.push(`${notes.length} site note${notes.length > 1 ? "s" : ""} attached to this job`);

  const clientHistory = completedJobCount > 0
    ? `${completedJobCount} completed job${completedJobCount > 1 ? "s" : ""} on record`
    : "New client — no previous jobs";

  const statusColor = STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600";
  const statusLabel = STATUS_LABELS[job.status] ?? job.status;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/jobs" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{job.job_title}</h1>
          <p className="text-sm text-gray-500">{customerName}</p>
        </div>
        <span className={`text-xs font-semibold rounded-full px-3 py-1 ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        {job.scheduled_date && <p className="text-sm text-slate-700">📅 {new Date(job.scheduled_date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>}
        {job.address && <p className="text-sm text-slate-700">📍 {job.address}</p>}
        {customer?.phone && <a href={`tel:${customer.phone}`} className="text-sm text-slate-700">📞 {customer.phone}</a>}
        {job.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mt-2">{job.notes}</p>}
      </div>

      {/* Recurring job info card */}
      {(job as Record<string, unknown>).is_recurring && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🔁</span>
              <div>
                <p className="text-sm font-semibold text-[#1B3A6B]">Recurring Job</p>
                <p className="text-xs text-blue-600 capitalize">
                  Repeats {
                    (job as Record<string, unknown>).recurrence_rule === "biweekly" ? "every 2 weeks" :
                    (job as Record<string, unknown>).recurrence_rule === "quarterly" ? "quarterly" :
                    String((job as Record<string, unknown>).recurrence_rule ?? "")
                  }
                  {(job as Record<string, unknown>).recurrence_end_date
                    ? ` · ends ${new Date(String((job as Record<string, unknown>).recurrence_end_date) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}
                </p>
              </div>
            </div>
            <form action={stopRecurring}>
              <input type="hidden" name="id" value={job.id} />
              <button type="submit" className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 bg-white font-medium">
                Stop Repeating
              </button>
            </form>
          </div>
          <p className="text-xs text-blue-500">Next occurrence will be scheduled automatically when this job is marked complete.</p>
        </div>
      )}

      <JobBrain
        jobTitle={job.job_title}
        description={job.notes}
        address={job.address}
        cityState={cityState}
        notes={notes?.map(n => n.body).join(" | ")}
        clientHistory={clientHistory}
        alerts={jobAlerts}
      />

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Update Status</p>
        <form action={updateStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={job.id} />
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <button key={val} name="status" value={val}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${job.status === val ? "border-transparent " + STATUS_COLORS[val] : "border-gray-200 text-gray-500 bg-white"}`}>
              {label}
            </button>
          ))}
        </form>
      </div>

      <PermitAssistant
        defaultDescription={job.job_title}
        defaultAddress={job.address ?? ""}
        jobId={job.id}
      />

      <JobScheduleModal
        jobId={job.id}
        jobTitle={job.job_title}
        initialDate={job.scheduled_date ?? null}
        initialAddress={job.address ?? null}
      />

      <div className="grid grid-cols-2 gap-3">
        {job.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address ?? "")}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl py-3 bg-white border border-gray-200 text-slate-700 font-semibold text-sm shadow-sm">
            🗺 Navigate
          </a>
        )}
        {!job.invoice_id ? (
          <form action={createInvoiceFromJob} className={job.address ? "" : "col-span-2"}>
            <input type="hidden" name="id" value={job.id} />
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold text-sm"
              style={{ backgroundColor: "#1B3A6B" }}>
              📄 Create Invoice
            </button>
          </form>
        ) : (
          <Link href={`/app/invoices/${job.invoice_id}`}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 bg-green-100 text-green-700 font-semibold text-sm ${job.address ? "" : "col-span-2"}`}>
            ✅ View Invoice
          </Link>
        )}
      </div>

      <PhotoGallery entityType="job" entityId={job.id} initialPhotos={photos ?? []} />

      {/* Template assigner — Owner/Admin only */}
      {canReview && !["completed", "submitted_for_review"].includes(job.status) && (
        <JobTemplateAssigner
          jobId={job.id}
          currentTemplateId={(job as any).template_id ?? null}
          currentTemplateName={templateName || null}
          templates={availableTemplates}
        />
      )}

      {/* Phase 2+3: Job Details (template fields) — only shown if template is assigned */}
      {(job as any).template_id && (
        <JobDetailsSection
          jobId={job.id}
          templateId={(job as any).template_id as string}
          templateName={templateName}
          requiredPhotoCount={requiredPhotoCount}
          currentPhotoCount={photos.length}
          fields={templateFields}
          initialResponses={fieldResponses}
        />
      )}

      {/* Phase 3: Complete Job button — shown when template assigned and job still active */}
      {(job as any).template_id && !["completed", "cancelled", "submitted_for_review"].includes(job.status) && (
        <JobCompleteButton
          jobId={job.id}
          fields={templateFields}
          savedResponses={fieldResponses}
          currentPhotoCount={photos.length}
          requiredPhotoCount={requiredPhotoCount}
          isOwnerOrAdmin={canReview}
        />
      )}

      {/* Phase 3: Report link — shown when job has a report (completed or submitted) */}
      {(job as any).template_id && ["completed", "submitted_for_review"].includes(job.status) && (
        <Link
          href={`/app/jobs/${job.id}/report`}
          className="flex items-center justify-center gap-2 w-full rounded-xl py-3 bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-sm shadow-sm">
          📋 View Job Report
        </Link>
      )}

      {/* Phase 4: Closeout package — shown for completed jobs with a template */}
      {(job as any).template_id && job.status === "completed" && (
        <Link
          href={`/app/jobs/${job.id}/closeout`}
          className="flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-white font-bold text-sm shadow-sm"
          style={{ backgroundColor: "#1B3A6B" }}>
          📦 Prepare Closeout Package
        </Link>
      )}

      {/* Phase 3: Admin review panel — shown when job awaiting review */}
      {job.status === "submitted_for_review" && canReview && (
        <JobReviewPanel jobId={job.id} />
      )}
      {/* TODO Phase 4: Generate invoice preview from report/template/quote */}
      {/* TODO Phase 4: Add warranty preview */}
      {/* TODO Phase 4: Allow trusted techs to send report/invoice/warranty to customer */}

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Notes</p>
        <form action={addNote} className="flex gap-2 mb-4">
          <input type="hidden" name="id" value={job.id} />
          <input name="body" placeholder="Add a note…"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <button type="submit"
            className="rounded-xl px-4 py-2 text-white text-sm font-semibold"
            style={{ backgroundColor: "#1B3A6B" }}>Add</button>
        </form>
        {!notes?.length && <p className="text-sm text-gray-400 text-center py-2">No notes yet.</p>}
        <div className="space-y-2">
          {notes?.map(note => (
            <div key={note.id} className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-slate-700">{note.body}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
      <EntityAiSection entityType="job" entityId={job.id} initialAttachments={aiAttachments} />
    </div>
  );
}
