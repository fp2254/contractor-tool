import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import { getOrgMembers, memberDisplayName } from "@/lib/teamUtils";
import JobsClient from "./JobsClient";

export default async function JobsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { role, userId } = await getUserOrgRole();
  const isMember = !isOwnerOrAdmin(role);

  const membersData = isOwnerOrAdmin(role)
    ? await getOrgMembers(orgId!)
    : [];

  const memberMap = Object.fromEntries(membersData.map(m => [m.userId, memberDisplayName(m)]));

  let jobsQuery = admin
    .from("jobs")
    .select("id,job_title,status,scheduled_date,address,city,state,customer_id,is_recurring,assigned_to")
    .eq("org_id", orgId!)
    .order("scheduled_date", { ascending: true });

  if (isMember && userId) {
    jobsQuery = jobsQuery.eq("assigned_to", userId);
  }

  const [{ data: jobs }, { data: customers }] = await Promise.all([
    jobsQuery,
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
    assignee_name: j.assigned_to ? (memberMap[j.assigned_to] ?? null) : null,
  }));

  return (
    <div className="p-4 lg:p-6 space-y-3 lg:space-y-4">
      <h1 className="text-xl font-bold text-slate-800">
        {isMember ? "My Jobs" : "Jobs"}
      </h1>
      <JobsClient jobs={jobsWithNames} showAssignee={isOwnerOrAdmin(role)} />
    </div>
  );
}
