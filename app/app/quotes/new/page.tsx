import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import NewQuoteClient from "./NewQuoteClient";

export default async function NewQuotePage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  const { data: customers } = await supabase
    .from("customers")
    .select("id,first_name,last_name,company_name")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  const customerOptions = (customers ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed",
  }));

  return (
    <Card title="New Quote">
      <NewQuoteClient customers={customerOptions} />
    </Card>
  );
}
