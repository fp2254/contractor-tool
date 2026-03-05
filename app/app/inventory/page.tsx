import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import InventoryClient, { type InventoryItem } from "./InventoryClient";

export default async function InventoryPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("inventory_items")
    .select("*")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  const items: InventoryItem[] = data ?? [];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">Inventory</h1>
      <InventoryClient initialItems={items} />
    </div>
  );
}
