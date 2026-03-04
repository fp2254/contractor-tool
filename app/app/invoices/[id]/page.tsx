import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

async function updateInvoiceStatus(formData: FormData) {
  "use server";
  const invoiceId = String(formData.get("invoice_id"));
  const status = String(formData.get("status"));
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  await supabase.from("invoices").update({ status }).eq("id", invoiceId).eq("org_id", orgId!);
  revalidatePath(`/app/invoices/${invoiceId}`);
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  const [{ data: invoice }, { data: items }] = await Promise.all([
    supabase.from("invoices").select("*").eq("org_id", orgId!).eq("id", id).maybeSingle(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id).eq("org_id", orgId!),
  ]);

  if (!invoice) return notFound();

  return (
    <Card title={`Invoice #${invoice.id.slice(0, 8)}`}>
      <form action={updateInvoiceStatus} className="mb-3 flex items-center gap-2">
        <input type="hidden" name="invoice_id" value={invoice.id} />
        <select name="status" defaultValue={invoice.status} className="rounded-lg border px-3 py-2">
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <Button type="submit" variant="secondary">
          Update
        </Button>
      </form>
      <div className="space-y-2">
        {items?.map((item) => (
          <div key={item.id} className="rounded-lg bg-slate-100 p-3 text-sm">
            {item.description} · {item.quantity} × ${item.unit_price} = ${item.total_price}
          </div>
        ))}
      </div>
      <p className="mt-3">Total ${invoice.total_amount}</p>
    </Card>
  );
}
