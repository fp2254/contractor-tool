import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { PhotoGallery } from "@/components/PhotoGallery";

const STATUS_OPTIONS = ["new","contacted","quoted","scheduled","won","lost"] as const;
const STATUS_COLORS: Record<string, string> = {
  new: "bg-orange-100 text-orange-700",
  contacted: "bg-blue-100 text-blue-700",
  quoted: "bg-purple-100 text-purple-700",
  scheduled: "bg-green-100 text-green-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

async function updateStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  await admin.from("leads").update({ status }).eq("id", id).eq("org_id", orgId!);
  revalidatePath(`/app/leads/${id}`);
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
    entity_type: "lead",
    entity_id: id,
    body: body.trim(),
    created_by: user.data.user?.id ?? null,
  });
  revalidatePath(`/app/leads/${id}`);
}

async function convertToCustomer(formData: FormData) {
  "use server";
  const leadId = String(formData.get("id"));
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: lead } = await admin.from("leads").select("*").eq("id", leadId).eq("org_id", orgId!).single();
  if (!lead) return;

  const nameParts = lead.name.split(" ");
  const firstName = nameParts[0] ?? lead.name;
  const lastName = nameParts.slice(1).join(" ") || null;

  const { data: customer } = await admin.from("customers").insert({
    org_id: orgId!,
    first_name: firstName,
    last_name: lastName,
    phone: lead.phone,
    email: lead.email,
    address_line1: lead.address,
    city: lead.city,
    state: lead.state,
    created_by_user: user.data.user?.id ?? null,
  }).select("id").single();

  if (!customer) return;

  await admin.from("leads").update({ converted_customer_id: customer.id, status: "won" }).eq("id", leadId).eq("org_id", orgId!);
  redirect(`/app/customers/${customer.id}`);
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: lead }, { data: notes }, { data: photos }] = await Promise.all([
    admin.from("leads").select("*").eq("id", id).eq("org_id", orgId!).maybeSingle(),
    admin.from("notes").select("*").eq("entity_type", "lead").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }).limit(20),
    admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "lead").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }),
  ]);

  if (!lead) return notFound();

  const statusColor = STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/leads" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-800 flex-1">{lead.name}</h1>
        <span className={`text-xs font-semibold rounded-full px-3 py-1 ${statusColor}`}>
          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
        </span>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-slate-700">📞 {lead.phone}</a>}
        {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-slate-700">✉️ {lead.email}</a>}
        {lead.address && <p className="text-sm text-slate-600">📍 {[lead.address, lead.city, lead.state].filter(Boolean).join(", ")}</p>}
        {lead.lead_source && <p className="text-sm text-gray-500">Source: {lead.lead_source}</p>}
        {lead.job_type && <p className="text-sm text-gray-500">Job type: {lead.job_type}</p>}
        {lead.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{lead.notes}</p>}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Update Status</p>
        <form action={updateStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={lead.id} />
          {STATUS_OPTIONS.map(s => (
            <button key={s} name="status" value={s}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${lead.status === s ? "border-transparent " + STATUS_COLORS[s] : "border-gray-200 text-gray-500 bg-white"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {lead.phone && (
          <a href={`tel:${lead.phone}`}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold text-sm"
            style={{ backgroundColor: "#1B3A6B" }}>
            📞 Call
          </a>
        )}
        {lead.phone && (
          <a href={`sms:${lead.phone}`}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold text-sm"
            style={{ backgroundColor: "#1B3A6B" }}>
            💬 Text
          </a>
        )}
        {!lead.converted_customer_id ? (
          <form action={convertToCustomer} className="col-span-2">
            <input type="hidden" name="id" value={lead.id} />
            <button type="submit"
              className="w-full rounded-xl py-3 font-semibold text-sm bg-green-600 text-white">
              ✅ Convert to Customer
            </button>
          </form>
        ) : (
          <Link href={`/app/customers/${lead.converted_customer_id}`}
            className="col-span-2 flex items-center justify-center rounded-xl py-3 font-semibold text-sm bg-green-100 text-green-700">
            👤 View Customer Profile
          </Link>
        )}
        <Link href={`/app/quotes/new?name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone ?? "")}&email=${encodeURIComponent(lead.email ?? "")}`}
          className="col-span-2 flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold text-sm"
          style={{ backgroundColor: "#1B3A6B" }}>
          📋 Create Quote
        </Link>
      </div>

      <PhotoGallery entityType="lead" entityId={lead.id} initialPhotos={photos ?? []} />

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Notes</p>
        <form action={addNote} className="flex gap-2 mb-4">
          <input type="hidden" name="id" value={lead.id} />
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
    </div>
  );
}
