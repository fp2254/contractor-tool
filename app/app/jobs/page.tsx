import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import JobsClient from "./JobsClient";

export default async function JobsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: jobs }, { data: customers }] = await Promise.all([
    admin
      .from("jobs")
      .select("id,job_title,status,scheduled_date,address,city,state,customer_id")
      .eq("org_id", orgId!)
      .order("scheduled_date", { ascending: true }),
    admin
      .from("customers")
      .select("id,first_name,last_name")
      .eq("org_id", orgId!),
  ]);

  const customerMap = Object.fromEntries(
    (customers ?? []).map((c) => [
      c.id,
      `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown",
    ])
  );

  const jobsWithNames = (jobs ?? []).map((j) => ({
    ...j,
    customer_name: customerMap[j.customer_id] ?? "Unknown",
  }));

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Jobs</h1>
      <JobsClient jobs={jobsWithNames} />
    </div>
  );
}
