import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole } from "@/lib/orgRole";
import { getOrgMembers } from "@/lib/teamUtils";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { role, userId } = await getUserOrgRole();

  const members = await getOrgMembers(orgId!);

  const memberUserIds = members.map(m => m.userId);

  const [{ data: jobs }, { data: quotes }, { data: invoices }] = await Promise.all([
    admin
      .from("jobs")
      .select("id,assigned_to,status,job_title,scheduled_date,customer_id")
      .eq("org_id", orgId!)
      .in("assigned_to", memberUserIds.length > 0 ? memberUserIds : ["__none__"]),
    admin
      .from("quotes")
      .select("id,assigned_to,status,total_amount,customer_id")
      .eq("org_id", orgId!)
      .in("assigned_to", memberUserIds.length > 0 ? memberUserIds : ["__none__"]),
    admin
      .from("invoices")
      .select("id,assigned_to,status,total_amount,customer_id")
      .eq("org_id", orgId!)
      .in("assigned_to", memberUserIds.length > 0 ? memberUserIds : ["__none__"]),
  ]);

  const { data: customers } = await admin
    .from("customers")
    .select("id,first_name,last_name")
    .eq("org_id", orgId!);

  const customerMap = Object.fromEntries(
    (customers ?? []).map(c => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown"])
  );

  const membersWithWork = members.map(m => ({
    ...m,
    jobs: (jobs ?? []).filter(j => j.assigned_to === m.userId).map(j => ({
      id: j.id,
      title: j.job_title ?? "Untitled",
      status: j.status ?? "scheduled",
      scheduledDate: j.scheduled_date as string | null,
      customerName: customerMap[j.customer_id ?? ""] ?? "Unknown",
    })),
    quotes: (quotes ?? []).filter(q => q.assigned_to === m.userId).map(q => ({
      id: q.id,
      status: q.status ?? "draft",
      amount: q.total_amount as number | null,
      customerName: customerMap[q.customer_id ?? ""] ?? "Unknown",
    })),
    invoices: (invoices ?? []).filter(i => i.assigned_to === m.userId).map(i => ({
      id: i.id,
      status: i.status ?? "unpaid",
      amount: i.total_amount as number | null,
      customerName: customerMap[i.customer_id ?? ""] ?? "Unknown",
    })),
  }));

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Team</h1>
      <TeamClient
        members={membersWithWork}
        isAdmin={role === "owner" || role === "admin"}
        currentUserId={userId ?? ""}
        orgId={orgId!}
      />
    </div>
  );
}
