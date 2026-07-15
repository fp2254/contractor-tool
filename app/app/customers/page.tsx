import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import ClientsListClient, { type ClientRow } from "./ClientsListClient";
import type { TradeContact } from "@/app/app/trade-contacts/TradeContactsClient";

export default async function ClientsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [
    { data: customers },
    { data: invoices },
    { data: jobs },
    { data: quotes },
    { data: tradeContactsRaw },
  ] = await Promise.all([
    admin
      .from("customers")
      .select("id,first_name,last_name,company_name,phone,email,address_line1,city,state,created_at")
      .eq("org_id", orgId!)
      .order("first_name", { ascending: true }),
    admin
      .from("invoices")
      .select("customer_id,status,total_amount")
      .eq("org_id", orgId!),
    admin
      .from("jobs")
      .select("customer_id,scheduled_date,status")
      .eq("org_id", orgId!)
      .order("scheduled_date", { ascending: false }),
    admin
      .from("quotes")
      .select("customer_id,status")
      .eq("org_id", orgId!),
    (admin as any)
      .from("trade_contacts")
      .select("*")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const clientData: ClientRow[] = (customers ?? []).map(c => {
    const cInvoices = invoices?.filter(i => i.customer_id === c.id) ?? [];
    const cJobs = jobs?.filter(j => j.customer_id === c.id) ?? [];
    const cQuotes = quotes?.filter(q => q.customer_id === c.id) ?? [];

    const lifetimeValue = cInvoices
      .filter(i => i.status === "paid")
      .reduce((s, i) => s + Number(i.total_amount), 0);

    const completedJob = cJobs.find(j => j.status === "completed");
    const lastJobDate = completedJob?.scheduled_date ?? cJobs[0]?.scheduled_date ?? null;

    const hasOverdue = cInvoices.some(i => i.status === "overdue");
    const hasUpcomingJob = cJobs.some(
      j => j.status === "scheduled" && (j.scheduled_date ?? "") >= today
    );
    const hasQuotePending = cQuotes.some(q => q.status === "sent");

    return { ...c, lifetimeValue, lastJobDate, hasOverdue, hasUpcomingJob, hasQuotePending };
  });

  // Enrich trade contacts with live slugs
  const contacts: TradeContact[] = tradeContactsRaw ?? [];
  const linkedOrgIds = contacts.map(c => c.linked_org_id).filter((id): id is string => !!id);
  let slugMap: Record<string, string> = {};
  if (linkedOrgIds.length > 0) {
    const { data: profiles } = await (admin as any)
      .from("public_profiles")
      .select("org_id, slug")
      .in("org_id", linkedOrgIds)
      .eq("is_published", true);
    slugMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.org_id, p.slug]));
  }
  const tradeContacts: TradeContact[] = contacts.map(c => ({
    ...c,
    linked_profile_slug: c.linked_org_id ? (slugMap[c.linked_org_id] ?? null) : null,
  }));

  return (
    <div className="p-4 lg:p-6">
      <Suspense fallback={null}>
        <ClientsListClient clients={clientData} tradeContacts={tradeContacts} />
      </Suspense>
    </div>
  );
}
