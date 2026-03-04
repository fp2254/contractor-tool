import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id,status,total_amount,created_at")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  return (
    <Card title="Invoices">
      <div className="space-y-2">
        {invoices?.map((invoice) => (
          <Link key={invoice.id} href={`/app/invoices/${invoice.id}`} className="block rounded-lg bg-slate-100 p-3">
            #{invoice.id.slice(0, 8)} · {invoice.status} · ${invoice.total_amount}
          </Link>
        ))}
      </div>
    </Card>
  );
}
