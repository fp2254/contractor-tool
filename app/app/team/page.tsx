import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole } from "@/lib/orgRole";
import { getOrgMembers, memberDisplayName } from "@/lib/teamUtils";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { role, userId } = await getUserOrgRole();

  const members = await getOrgMembers(orgId!);
  const memberUserIds = members.map(m => m.userId);

  const [
    { data: allJobs },
    { data: allQuotes },
    { data: allInvoices },
    { data: customers },
    { data: archivedQuoteNotes },
    { data: archivedInvoiceNotes },
  ] = await Promise.all([
    admin
      .from("jobs")
      .select("id,assigned_to,status,job_title,scheduled_date,customer_id")
      .eq("org_id", orgId!),
    admin
      .from("quotes")
      .select("id,assigned_to,status,total_amount,customer_id")
      .eq("org_id", orgId!),
    admin
      .from("invoices")
      .select("id,assigned_to,status,total_amount,customer_id")
      .eq("org_id", orgId!),
    admin
      .from("customers")
      .select("id,first_name,last_name")
      .eq("org_id", orgId!),
    admin.from("notes").select("entity_id").eq("org_id", orgId!).eq("entity_type", "quote").eq("body", "__archived__"),
    admin.from("notes").select("entity_id").eq("org_id", orgId!).eq("entity_type", "invoice").eq("body", "__archived__"),
  ]);

  const customerMap = Object.fromEntries(
    (customers ?? []).map(c => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown"])
  );

  const archivedQuoteIds = new Set((archivedQuoteNotes ?? []).map(n => n.entity_id as string));
  const archivedInvoiceIds = new Set((archivedInvoiceNotes ?? []).map(n => n.entity_id as string));

  // "Active workload" = work that still needs attention. Once a job is
  // completed/cancelled, a quote is accepted/declined, or an invoice is
  // paid/archived, it's done — it shouldn't keep showing up as assigned work.
  const activeJobs = (allJobs ?? []).filter(j => j.status !== "completed" && j.status !== "cancelled");
  const activeQuotes = (allQuotes ?? []).filter(q => !archivedQuoteIds.has(q.id) && q.status !== "accepted" && q.status !== "declined");
  const activeInvoices = (allInvoices ?? []).filter(i => !archivedInvoiceIds.has(i.id) && i.status !== "paid");

  const membersWithWork = members.map(m => ({
    ...m,
    jobs: activeJobs.filter(j => j.assigned_to === m.userId).map(j => ({
      id: j.id,
      title: j.job_title ?? "Untitled",
      status: j.status ?? "scheduled",
      scheduledDate: j.scheduled_date as string | null,
      customerName: customerMap[j.customer_id ?? ""] ?? "Unknown",
    })),
    quotes: activeQuotes.filter(q => q.assigned_to === m.userId).map(q => ({
      id: q.id,
      status: q.status ?? "draft",
      amount: q.total_amount as number | null,
      customerName: customerMap[q.customer_id ?? ""] ?? "Unknown",
    })),
    invoices: activeInvoices.filter(i => i.assigned_to === m.userId).map(i => ({
      id: i.id,
      status: i.status ?? "unpaid",
      amount: i.total_amount as number | null,
      customerName: customerMap[i.customer_id ?? ""] ?? "Unknown",
    })),
  }));

  // Unassigned active work — surfaced so admins can quickly hand it out.
  const unassignedJobs = activeJobs.filter(j => !j.assigned_to || !memberUserIds.includes(j.assigned_to)).map(j => ({
    id: j.id,
    title: j.job_title ?? "Untitled",
    status: j.status ?? "scheduled",
    scheduledDate: j.scheduled_date as string | null,
    customerName: customerMap[j.customer_id ?? ""] ?? "Unknown",
  }));
  const unassignedQuotes = activeQuotes.filter(q => !q.assigned_to || !memberUserIds.includes(q.assigned_to)).map(q => ({
    id: q.id,
    status: q.status ?? "draft",
    amount: q.total_amount as number | null,
    customerName: customerMap[q.customer_id ?? ""] ?? "Unknown",
  }));
  const unassignedInvoices = activeInvoices.filter(i => !i.assigned_to || !memberUserIds.includes(i.assigned_to)).map(i => ({
    id: i.id,
    status: i.status ?? "unpaid",
    amount: i.total_amount as number | null,
    customerName: customerMap[i.customer_id ?? ""] ?? "Unknown",
  }));

  // Calendar data: every job with a scheduled date (regardless of status)
  // so admins can see the full picture when planning who's doing what, when.
  const calendarJobs = (allJobs ?? [])
    .filter(j => !!j.scheduled_date)
    .map(j => ({
      id: j.id,
      title: j.job_title ?? "Untitled",
      status: j.status ?? "scheduled",
      scheduledDate: j.scheduled_date as string,
      assignedTo: j.assigned_to as string | null,
      customerName: customerMap[j.customer_id ?? ""] ?? "Unknown",
    }));

  const memberOptions = members.map(m => ({ userId: m.userId, name: memberDisplayName(m) }));

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Team</h1>
      <TeamClient
        members={membersWithWork}
        isAdmin={role === "owner" || role === "admin"}
        currentUserId={userId ?? ""}
        orgId={orgId!}
        unassignedJobs={unassignedJobs}
        unassignedQuotes={unassignedQuotes}
        unassignedInvoices={unassignedInvoices}
        calendarJobs={calendarJobs}
        memberOptions={memberOptions}
      />
    </div>
  );
}
