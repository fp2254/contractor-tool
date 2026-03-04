import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: jobs }, { data: customers }] = await Promise.all([
    admin
      .from("jobs")
      .select("id,job_title,status,scheduled_date,address,city,state,customer_id")
      .eq("org_id", orgId!)
      .not("scheduled_date", "is", null)
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

  const enriched = (jobs ?? []).map((j) => ({
    id: j.id,
    job_title: j.job_title ?? "Untitled Job",
    status: j.status ?? "scheduled",
    scheduled_date: j.scheduled_date!,
    address: j.address,
    city: j.city,
    state: j.state,
    customer_name: customerMap[j.customer_id] ?? "Unknown",
  }));

  return <ScheduleClient jobs={enriched} />;
}
