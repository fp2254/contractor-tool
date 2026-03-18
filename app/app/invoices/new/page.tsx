import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import NewInvoiceClient from "./NewInvoiceClient";

export default async function NewInvoicePage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: customers }, { data: settings }] = await Promise.all([
    admin
      .from("customers")
      .select("id,first_name,last_name,company_name")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false }),
    admin
      .from("org_settings")
      .select("default_warranty_text")
      .eq("org_id", orgId!)
      .maybeSingle(),
  ]);

  const customerOptions = (customers ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed",
  }));

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-slate-800 mb-4">New Invoice</h1>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <NewInvoiceClient
          customers={customerOptions}
          defaultWarrantyText={(settings as any)?.default_warranty_text ?? ""}
        />
      </div>
    </div>
  );
}
