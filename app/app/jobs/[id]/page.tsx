import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PermitAssistant } from "@/components/PermitAssistant";
import { EntityAiSection, type AiAttachment } from "@/components/EntityAiSection";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

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

  const { data: job } = await admin.from("jobs").select("customer_id,job_title,quote_id").eq("id", jobId).eq("org_id", orgId!).single();
  if (!job) return;

  let amount = 0;
  let items: { description: string; quantity: number; unit_price: number; total_price: number }[] = [];

  if (job.quote_id) {
    const { data: qItems } = await admin.from("quote_items").select("*").eq("quote_id", job.quote_id).eq("org_id", orgId!);
    items = (qItems ?? []).map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price }));
    amount = items.reduce((s, i) => s + i.total_price, 0);
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

  if (items.length > 0) {
    await admin.from("invoice_items").insert(items.map(i => ({ ...i, org_id: orgId!, invoice_id: invoice.id })));
  }

  await admin.from("jobs").update({ invoice_id: invoice.id }).eq("id", jobId).eq("org_id", orgId!);
  redirect(`/app/invoices/${invoice.id}`);
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: job }, { data: notes }, { data: photos }] = await Promise.all([
    admin.from("jobs").select("*").eq("id", id).eq("org_id", orgId!).maybeSingle(),
    admin.from("notes").select("*").eq("entity_type", "job").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }).limit(20),
    admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "job").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }),
  ]);

  if (!job) return notFound();

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

  const { data: customer } = await admin.from("customers").select("first_name,last_name,phone").eq("id", job.customer_id).single();
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Unknown";

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

      <div className="grid grid-cols-2 gap-3">
        {job.scheduled_date && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address ?? "")}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl py-3 bg-white border border-gray-200 text-slate-700 font-semibold text-sm shadow-sm">
            🗺 Navigate
          </a>
        )}
        {!job.invoice_id ? (
          <form action={createInvoiceFromJob}>
            <input type="hidden" name="id" value={job.id} />
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold text-sm"
              style={{ backgroundColor: "#1B3A6B" }}>
              📄 Create Invoice
            </button>
          </form>
        ) : (
          <Link href={`/app/invoices/${job.invoice_id}`}
            className="flex items-center justify-center gap-2 rounded-xl py-3 bg-green-100 text-green-700 font-semibold text-sm">
            ✅ View Invoice
          </Link>
        )}
      </div>

      <PhotoGallery entityType="job" entityId={job.id} initialPhotos={photos ?? []} />

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
