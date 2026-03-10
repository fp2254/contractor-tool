import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import ReceiptsClient from "./ReceiptsClient";

export default async function ReceiptsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: expenses }, { data: customers }, { data: jobs }, { data: inventory }] = await Promise.all([
    admin
      .from("expenses")
      .select("id,vendor,receipt_date,total_amount,job_id,created_at,line_items")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("customers")
      .select("id,first_name,last_name")
      .eq("org_id", orgId!),
    admin
      .from("jobs")
      .select("id,job_title,customer_id,scheduled_date")
      .eq("org_id", orgId!)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_date", { ascending: false })
      .limit(50),
    admin
      .from("inventory_items")
      .select("id,name,sku,category,quantity,unit_cost")
      .eq("org_id", orgId!)
      .order("name", { ascending: true }),
  ]);

  const customerMap = Object.fromEntries(
    (customers ?? []).map(c => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()])
  );

  const jobOptions = (jobs ?? []).map(j => ({
    id: j.id,
    job_title: j.job_title || "Untitled Job",
    customer_name: customerMap[j.customer_id] ?? "",
    scheduled_date: j.scheduled_date,
  }));

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Receipt Scan</h1>
      <Suspense fallback={null}>
        <ReceiptsClient
          initialExpenses={expenses ?? []}
          jobs={jobOptions}
          inventoryItems={inventory ?? []}
        />
      </Suspense>
    </div>
  );
}
