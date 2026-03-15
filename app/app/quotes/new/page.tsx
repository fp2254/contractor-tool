import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import NewQuoteClient from "./NewQuoteClient";

export default async function NewQuotePage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: customers }, { data: presets }, { data: settings }] = await Promise.all([
    admin
      .from("customers")
      .select("id,first_name,last_name,company_name")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false }),
    admin
      .from("service_presets")
      .select("id,service_name,description,price_type,flat_rate,hourly_rate,estimated_hours")
      .eq("org_id", orgId!)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    admin
      .from("org_settings")
      .select("default_warranty_text")
      .eq("org_id", orgId!)
      .maybeSingle(),
  ]);

  const customerOptions = (customers ?? []).map((c) => ({
    id: c.id,
    name:
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.company_name ||
      "Unnamed",
  }));

  const presetOptions = (presets ?? []).map((p) => ({
    id: p.id,
    name: p.service_name,
    description: p.description,
    price:
      p.price_type === "flat"
        ? (p.flat_rate ?? 0)
        : (p.hourly_rate ?? 0) * (p.estimated_hours ?? 1),
  }));

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">New Quote</h1>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <NewQuoteClient
          customers={customerOptions}
          presets={presetOptions}
          defaultWarrantyText={(settings as any)?.default_warranty_text ?? ""}
        />
      </div>
    </div>
  );
}
