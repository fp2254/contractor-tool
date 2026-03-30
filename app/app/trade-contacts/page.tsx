import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import TradeContactsClient, { type TradeContact } from "./TradeContactsClient";

export default async function TradeContactsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("trade_contacts")
    .select("*")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  const contacts: TradeContact[] = data ?? [];

  // For any contacts already linked to a TradeBase org, fetch the current slug
  // so the profile URL is always derived live, never hardcoded.
  const linkedOrgIds = contacts
    .map((c) => c.linked_org_id)
    .filter((id): id is string => !!id);

  let slugMap: Record<string, string> = {};
  if (linkedOrgIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin as any)
      .from("public_profiles")
      .select("org_id, slug")
      .in("org_id", linkedOrgIds)
      .eq("is_published", true);

    slugMap = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profiles ?? []).map((p: any) => [p.org_id, p.slug])
    );
  }

  // Attach live slug to each contact
  const enriched = contacts.map((c) => ({
    ...c,
    linked_profile_slug: c.linked_org_id ? (slugMap[c.linked_org_id] ?? null) : null,
  }));

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">Trade Contacts</h1>
      <TradeContactsClient initialContacts={enriched} />
    </div>
  );
}
