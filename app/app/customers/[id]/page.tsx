import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  const [{ data: customer }, { data: quotes }, { data: invoices }] = await Promise.all([
    supabase.from("customers").select("*").eq("org_id", orgId!).eq("id", id).maybeSingle(),
    supabase.from("quotes").select("id,status,total_amount,created_at").eq("org_id", orgId!).eq("customer_id", id),
    supabase.from("invoices").select("id,status,total_amount,created_at").eq("org_id", orgId!).eq("customer_id", id),
  ]);

  if (!customer) return notFound();

  return (
    <div className="grid gap-4">
      <Card title={[customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Customer"}>
        <p>{customer.email ?? ""}</p>
        <p>{customer.phone ?? ""}</p>
        <p className="text-slate-600">{customer.address_line1 ?? ""}</p>
      </Card>
      <Card title="Quotes">
        <div className="space-y-2">
          {quotes?.map((q) => (
            <Link key={q.id} href={`/app/quotes/${q.id}`} className="block rounded-lg bg-slate-100 p-3">
              #{q.id.slice(0, 8)} · {q.status} · ${q.total_amount}
            </Link>
          ))}
        </div>
      </Card>
      <Card title="Invoices">
        <div className="space-y-2">
          {invoices?.map((inv) => (
            <Link key={inv.id} href={`/app/invoices/${inv.id}`} className="block rounded-lg bg-slate-100 p-3">
              #{inv.id.slice(0, 8)} · {inv.status} · ${inv.total_amount}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
