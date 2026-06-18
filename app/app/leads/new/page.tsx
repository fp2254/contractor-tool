import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

async function createLead(formData: FormData) {
  "use server";
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: lead, error } = await admin.from("leads").insert({
    org_id: orgId!,
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    city: String(formData.get("city") ?? "") || null,
    state: String(formData.get("state") ?? "") || null,
    lead_source: String(formData.get("lead_source") ?? "") || null,
    job_type: String(formData.get("job_type") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    status: "new",
    created_by_user: user.data.user?.id ?? null,
  }).select("id").single();

  if (error || !lead) return;
  redirect(`/app/leads/${lead.id}`);
}

const LEAD_SOURCES = ["Referral", "Google", "Facebook", "Door Hanger", "Yard Sign", "Website", "Word of Mouth", "Other"];

export default async function NewLeadPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: presets } = await admin
    .from("service_presets")
    .select("service_name")
    .eq("org_id", orgId!)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const serviceNames = (presets ?? []).map(p => p.service_name).filter(Boolean);

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <a href="/app/leads" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <h1 className="text-xl font-bold text-slate-800">New Lead</h1>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <form action={createLead} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name *</label>
            <input name="name" required placeholder="Full name"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
              <input name="phone" type="tel" placeholder="Phone"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
              <input name="email" type="email" placeholder="Email"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Address</label>
            <input name="address" placeholder="Street address"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">City</label>
              <input name="city" placeholder="City"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">State</label>
              <input name="state" placeholder="State" maxLength={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lead Source</label>
            <select name="lead_source"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">Select source…</option>
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Service Type
              {serviceNames.length === 0 && (
                <span className="ml-2 normal-case font-normal text-gray-400">
                  — <a href="/app/profile" className="text-blue-500 underline">add your services</a> to see them here
                </span>
              )}
            </label>
            {serviceNames.length > 0 ? (
              <select name="job_type"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">Select service…</option>
                {serviceNames.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="Other">Other</option>
              </select>
            ) : (
              <input name="job_type" placeholder="e.g. Roof repair, Plumbing, HVAC…"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <textarea name="notes" rows={3} placeholder="Any additional notes…"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <button type="submit"
            className="w-full rounded-xl py-3 text-white font-semibold"
            style={{ backgroundColor: "#1B3A6B" }}>
            Save Lead
          </button>
        </form>
      </div>
    </div>
  );
}
