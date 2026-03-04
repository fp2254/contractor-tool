import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

async function createJob(formData: FormData) {
  "use server";
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: job } = await admin.from("jobs").insert({
    org_id: orgId!,
    customer_id: String(formData.get("customer_id")),
    job_title: String(formData.get("job_title")),
    status: "scheduled",
    scheduled_date: String(formData.get("scheduled_date")) || null,
    address: String(formData.get("address")) || null,
    notes: String(formData.get("notes")) || null,
    created_by_user: user.data.user?.id ?? null,
  }).select("id").single();

  if (!job) return;
  redirect(`/app/jobs/${job.id}`);
}

export default async function NewJobPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { data: customers } = await admin
    .from("customers").select("id,first_name,last_name,company_name")
    .eq("org_id", orgId!).order("created_at", { ascending: false });

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/app/jobs" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-800">New Job</h1>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <form action={createJob} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Customer *</label>
            <select name="customer_id" required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">Select customer…</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Job Title *</label>
            <input name="job_title" required placeholder="e.g. Radon Mitigation"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Scheduled Date</label>
            <input name="scheduled_date" type="date"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Job Address</label>
            <input name="address" placeholder="Work site address"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <textarea name="notes" rows={3} placeholder="Job notes…"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <button type="submit"
            className="w-full rounded-xl py-3 text-white font-semibold"
            style={{ backgroundColor: "#1B3A6B" }}>
            Schedule Job
          </button>
        </form>
      </div>
    </div>
  );
}
