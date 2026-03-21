import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { PhotoGallery } from "@/components/PhotoGallery";
import { EntityAiSection, type AiAttachment } from "@/components/EntityAiSection";
import { CustomerEditCard } from "./CustomerEditCard";

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
    entity_type: "customer",
    entity_id: id,
    body: body.trim(),
    created_by: user.data.user?.id ?? null,
  });
  revalidatePath(`/app/customers/${id}`);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  unpaid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [
    { data: customer },
    { data: quotes },
    { data: jobs },
    { data: invoices },
    { data: notes },
    { data: photos },
  ] = await Promise.all([
    admin.from("customers").select("*").eq("id", id).eq("org_id", orgId!).maybeSingle(),
    admin.from("quotes").select("id,status,total_amount,created_at").eq("customer_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }),
    admin.from("jobs").select("id,job_title,status,scheduled_date").eq("customer_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }),
    admin.from("invoices").select("id,status,total_amount,invoice_number,created_at").eq("customer_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }),
    admin.from("notes").select("*").eq("entity_type", "customer").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }).limit(20),
    admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "customer").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }),
  ]);

  if (!customer) return notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: aiAttachmentsRaw } = await (admin as any)
    .from("ai_attachments")
    .select("id, title, note, is_pinned, created_at, ai_runs(id, feature, input_text, output_json, output_text, created_at)")
    .eq("org_id", orgId!)
    .eq("entity_type", "customer")
    .eq("entity_id", id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  const aiAttachments: AiAttachment[] = aiAttachmentsRaw ?? [];

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Client";
  const address = [customer.address_line1, customer.city, customer.state, customer.zip].filter(Boolean).join(", ");
  const mapsUrl = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null;

  const lifetimeValue = invoices?.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0) ?? 0;
  const outstandingBalance = invoices?.filter(i => i.status === "unpaid" || i.status === "overdue").reduce((s, i) => s + Number(i.total_amount), 0) ?? 0;
  const jobsCompleted = jobs?.filter(j => j.status === "completed").length ?? 0;
  const quotesSent = quotes?.filter(q => q.status === "sent" || q.status === "accepted").length ?? 0;

  const lastCompletedJob = jobs?.find(j => j.status === "completed");
  const lastCompletedJobDate = lastCompletedJob?.scheduled_date ?? null;
  const clientSince = customer.created_at;

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const hasFollowUpNeeded = quotes?.some(
    q => q.status === "sent" && q.created_at < threeDaysAgo
  ) ?? false;
  const hasOverdueInvoice = invoices?.some(i => i.status === "overdue") ?? false;
  const isRepeatClient = jobsCompleted > 1;
  const isHighValue = lifetimeValue >= 5000;
  const isNewClient = jobsCompleted === 0;

  type Flag = { icon: string; label: string; style: string };
  const flags: Flag[] = [];
  if (hasFollowUpNeeded) flags.push({ icon: "⚠️", label: "Quote pending follow-up", style: "bg-amber-50 text-amber-700 border border-amber-200" });
  if (hasOverdueInvoice)  flags.push({ icon: "⚠️", label: "Invoice overdue", style: "bg-red-50 text-red-700 border border-red-200" });
  if (isHighValue)        flags.push({ icon: "⭐", label: "High Value Client", style: "bg-yellow-50 text-yellow-700 border border-yellow-200" });
  if (isRepeatClient)     flags.push({ icon: "⭐", label: "Repeat Client", style: "bg-green-50 text-green-700 border border-green-200" });
  if (isNewClient)        flags.push({ icon: "🆕", label: "New Client", style: "bg-blue-50 text-blue-700 border border-blue-100" });

  function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/customers" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{name}</h1>
          {customer.company_name && customer.first_name && (
            <p className="text-sm text-gray-500">{customer.company_name}</p>
          )}
        </div>
      </div>

      {/* Contact info — inline editable */}
      <CustomerEditCard customer={{
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name ?? null,
        company_name: customer.company_name ?? null,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        address_line1: customer.address_line1 ?? null,
        city: customer.city ?? null,
        state: customer.state ?? null,
        zip: (customer as Record<string, unknown>).zip as string | null ?? null,
      }} />

      {/* Quick action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {customer.phone && (
          <a href={`tel:${customer.phone}`}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-3 bg-white border border-gray-200 shadow-sm active:bg-gray-50">
            <span className="text-xl">📞</span>
            <span className="text-xs font-semibold text-slate-700">Call</span>
          </a>
        )}
        {customer.phone && (
          <a href={`sms:${customer.phone}`}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-3 bg-white border border-gray-200 shadow-sm active:bg-gray-50">
            <span className="text-xl">💬</span>
            <span className="text-xs font-semibold text-slate-700">Text</span>
          </a>
        )}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-3 bg-white border border-gray-200 shadow-sm active:bg-gray-50">
            <span className="text-xl">🗺️</span>
            <span className="text-xs font-semibold text-slate-700">Navigate</span>
          </a>
        )}
        <Link href={`/app/quotes/new`}
          className="flex flex-col items-center justify-center gap-1 rounded-xl py-3 text-white shadow-sm active:opacity-90"
          style={{ backgroundColor: "#1B3A6B" }}>
          <span className="text-xl">📋</span>
          <span className="text-xs font-semibold">New Quote</span>
        </Link>
        <Link href={`/app/jobs/new`}
          className="flex flex-col items-center justify-center gap-1 rounded-xl py-3 bg-white border border-gray-200 shadow-sm active:bg-gray-50">
          <span className="text-xl">🔨</span>
          <span className="text-xs font-semibold text-slate-700">Schedule Job</span>
        </Link>
      </div>

      {/* Client Intelligence Panel */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Client Insights</p>

        {flags.length > 0 && (
          <div className="space-y-2 mb-4">
            {flags.map((flag, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${flag.style}`}>
                <span className="text-base leading-none">{flag.icon}</span>
                <span>{flag.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-500 mb-0.5 font-medium">Lifetime Value</p>
            <p className="text-lg font-bold text-green-700">${lifetimeValue.toLocaleString()}</p>
          </div>
          <div className={`rounded-xl p-3 ${outstandingBalance > 0 ? "bg-red-50" : "bg-gray-50"}`}>
            <p className="text-[11px] text-gray-500 mb-0.5 font-medium">Outstanding</p>
            <p className={`text-lg font-bold ${outstandingBalance > 0 ? "text-red-600" : "text-gray-400"}`}>
              ${outstandingBalance.toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-500 mb-0.5 font-medium">Jobs Completed</p>
            <p className="text-lg font-bold text-blue-700">{jobsCompleted}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-500 mb-0.5 font-medium">Quotes Sent</p>
            <p className="text-lg font-bold text-purple-700">{quotesSent}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-500 mb-0.5 font-medium">Last Job</p>
            <p className="text-sm font-bold text-slate-700">{fmtDate(lastCompletedJobDate)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-500 mb-0.5 font-medium">Client Since</p>
            <p className="text-sm font-bold text-slate-700">{fmtDate(clientSince)}</p>
          </div>
        </div>
      </div>

      {/* Quotes */}
      {quotes && quotes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 uppercase px-4 pt-4 pb-2">
            Quotes ({quotes.length})
          </p>
          <div className="divide-y divide-gray-100">
            {quotes.map(q => (
              <Link key={q.id} href={`/app/quotes/${q.id}`} className="flex items-center justify-between px-4 py-3 active:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-slate-700">Quote #{q.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[q.status] ?? "bg-gray-100"}`}>
                    {q.status}
                  </span>
                  <span className="text-sm font-bold text-slate-800">${Number(q.total_amount).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Jobs */}
      {jobs && jobs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 uppercase px-4 pt-4 pb-2">
            Jobs ({jobs.length})
          </p>
          <div className="divide-y divide-gray-100">
            {jobs.map(j => (
              <Link key={j.id} href={`/app/jobs/${j.id}`} className="flex items-center justify-between px-4 py-3 active:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-slate-700">{j.job_title}</p>
                  {j.scheduled_date && (
                    <p className="text-xs text-gray-400">
                      {new Date(j.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[j.status] ?? "bg-gray-100"}`}>
                  {j.status.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      {invoices && invoices.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 uppercase px-4 pt-4 pb-2">
            Invoices ({invoices.length})
          </p>
          <div className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <Link key={inv.id} href={`/app/invoices/${inv.id}`} className="flex items-center justify-between px-4 py-3 active:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-slate-700">{inv.invoice_number ?? `#${inv.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[inv.status] ?? "bg-gray-100"}`}>
                    {inv.status}
                  </span>
                  <span className="text-sm font-bold text-slate-800">${Number(inv.total_amount).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <PhotoGallery entityType="customer" entityId={customer.id} initialPhotos={photos ?? []} />

      {/* Notes */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Notes</p>
        <form action={addNote} className="flex gap-2 mb-4">
          <input type="hidden" name="id" value={customer.id} />
          <input
            name="body"
            placeholder="Add a note…"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button type="submit"
            className="rounded-xl px-4 py-2 text-white text-sm font-semibold"
            style={{ backgroundColor: "#1B3A6B" }}>
            Add
          </button>
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

      <EntityAiSection entityType="customer" entityId={customer.id} initialAttachments={aiAttachments} />
    </div>
  );
}
