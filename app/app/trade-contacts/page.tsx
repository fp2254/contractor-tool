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

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">Trade Contacts</h1>
      <TradeContactsClient initialContacts={contacts} />
    </div>
  );
}
