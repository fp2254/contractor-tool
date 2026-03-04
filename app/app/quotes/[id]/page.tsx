import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

async function convertToInvoice(formData: FormData) {
  "use server";
  const quoteId = String(formData.get("quote_id"));
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const user = await supabase.auth.getUser();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id,org_id,customer_id,total_amount")
    .eq("org_id", orgId!)
    .eq("id", quoteId)
    .single();

  if (!quote?.customer_id) {
    redirect(`/app/quotes/${quoteId}?error=missing_customer`);
  }

  const [{ data: items }, { data: org }] = await Promise.all([
    supabase.from("quote_items").select("description,quantity,unit_price,total_price").eq("quote_id", quote.id).eq("org_id", orgId!),
    supabase.from("orgs").select("default_payment_terms_days").eq("id", orgId!).single(),
  ]);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (org?.default_payment_terms_days ?? 14));

  const { data: invoice } = await supabase
    .from("invoices")
    .insert({
      org_id: quote.org_id,
      customer_id: quote.customer_id,
      status: "unpaid",
      total_amount: quote.total_amount,
      invoice_number: `INV-${Date.now()}`,
      due_date: dueDate.toISOString(),
      created_by_user: user.data.user?.id ?? null,
    })
    .select("id")
    .single();

  if (!invoice) return;

  await Promise.all([
    supabase.from("invoice_items").insert(
      (items ?? []).map((item) => ({
        org_id: orgId!,
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
    ),
    supabase.from("quotes").update({ invoice_id: invoice.id }).eq("id", quote.id).eq("org_id", orgId!),
  ]);

  await logActivity({
    entity_type: "invoice",
    entity_id: invoice.id,
    action: "invoice_created_from_quote",
    description: `Invoice created from quote ${quote.id}`,
  });

  revalidatePath(`/app/quotes/${quoteId}`);
  redirect(`/app/invoices/${invoice.id}`);
}

async function updateQuoteStatus(formData: FormData) {
  "use server";
  const quoteId = String(formData.get("quote_id"));
  const status = String(formData.get("status"));
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  const update: Record<string, string | null> = { status };
  if (status === "sent") update.sent_at = new Date().toISOString();
  if (status === "accepted") update.accepted_at = new Date().toISOString();
  if (status === "declined") update.declined_at = new Date().toISOString();

  await supabase.from("quotes").update(update).eq("id", quoteId).eq("org_id", orgId!);
  revalidatePath(`/app/quotes/${quoteId}`);
}

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  const [{ data: quote }, { data: items }] = await Promise.all([
    supabase.from("quotes").select("*").eq("org_id", orgId!).eq("id", id).maybeSingle(),
    supabase.from("quote_items").select("*").eq("quote_id", id).eq("org_id", orgId!),
  ]);

  if (!quote) return notFound();

  return (
    <div className="grid gap-4">
      {query?.error === "missing_customer" ? (
        <p className="rounded-lg bg-red-100 p-3 text-sm text-red-700">Quote has no customer. Add a customer before converting.</p>
      ) : null}
      <Card title={`Quote #${quote.id.slice(0, 8)}`}>
        <form action={updateQuoteStatus} className="mb-3 flex items-center gap-2">
          <input type="hidden" name="quote_id" value={quote.id} />
          <select name="status" defaultValue={quote.status} className="rounded-lg border px-3 py-2">
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
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
        <p className="mt-3">Total ${quote.total_amount}</p>
      </Card>
      <form action={convertToInvoice}>
        <input type="hidden" name="quote_id" value={quote.id} />
        <Button type="submit" className="w-full">
          Convert to Invoice
        </Button>
      </form>
    </div>
  );
}
