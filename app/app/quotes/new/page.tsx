import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import NewQuoteClient from "./NewQuoteClient";

export default async function NewQuotePage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: customers } = await admin
    .from("customers")
    .select("id,first_name,last_name,company_name")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  const customerOptions = (customers ?? []).map((c) => ({
    id: c.id,
    name:
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.company_name ||
      "Unnamed",
  }));

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">New Quote</h1>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <NewQuoteClient customers={customerOptions} />
      </div>
    </div>
  );
}
