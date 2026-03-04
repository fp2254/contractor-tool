import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { SendEmailButton } from "@/components/SendEmailButton";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

async function updateStatus(formData: FormData) {
  "use server";
  const quoteId = String(formData.get("quote_id"));
  const status = String(formData.get("status"));
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const update: Record<string, string | null> = { status };
  if (status === "sent") update.sent_at = new Date().toISOString();
  if (status === "accepted") update.accepted_at = new Date().toISOString();
  if (status === "declined") update.declined_at = new Date().toISOString();
  await admin.from("quotes").update(update).eq("id", quoteId).eq("org_id", orgId!);
  revalidatePath(`/app/quotes/${quoteId}`);
}

async function convertToInvoice(formData: FormData) {
  "use server";
  const quoteId = String(formData.get("quote_id"));
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: quote } = await admin.from("quotes").select("*").eq("id", quoteId).eq("org_id", orgId!).single();
  if (!quote?.customer_id) return;

  const [{ data: items }, { data: org }] = await Promise.all([
    admin.from("quote_items").select("*").eq("quote_id", quoteId).eq("org_id", orgId!),
    admin.from("orgs").select("default_payment_terms_days").eq("id", orgId!).single(),
  ]);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (org?.default_payment_terms_days ?? 14));

  const { data: invoice } = await admin.from("invoices").insert({
    org_id: orgId!,
    customer_id: quote.customer_id,
    status: "unpaid",
    total_amount: quote.total_amount,
    invoice_number: `INV-${Date.now()}`,
    due_date: dueDate.toISOString(),
    created_by_user: user.data.user?.id ?? null,
  }).select("id").single();

  if (!invoice) return;

  await Promise.all([
    admin.from("invoice_items").insert((items ?? []).map(i => ({
      org_id: orgId!, invoice_id: invoice.id,
      description: i.description, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price,
    }))),
    admin.from("quotes").update({ invoice_id: invoice.id }).eq("id", quoteId).eq("org_id", orgId!),
  ]);

  redirect(`/app/invoices/${invoice.id}`);
}

async function convertToJob(formData: FormData) {
  "use server";
  const quoteId = String(formData.get("quote_id"));
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: quote } = await admin.from("quotes").select("*").eq("id", quoteId).eq("org_id", orgId!).single();
  if (!quote?.customer_id) return;

  const { data: customer } = await admin.from("customers").select("first_name,last_name,address_line1,city,state").eq("id", quote.customer_id).single();
  const jobTitle = String(formData.get("job_title")) || `Job from Quote #${quoteId.slice(0,8)}`;

  const { data: job } = await admin.from("jobs").insert({
    org_id: orgId!,
    customer_id: quote.customer_id,
    quote_id: quoteId,
    job_title: jobTitle,
    status: "scheduled",
    address: customer?.address_line1 ?? null,
    scheduled_date: String(formData.get("scheduled_date")) || null,
    created_by_user: user.data.user?.id ?? null,
  }).select("id").single();

  if (!job) return;
  await admin.from("quotes").update({ status: "accepted" }).eq("id", quoteId).eq("org_id", orgId!);
  redirect(`/app/jobs/${job.id}`);
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: quote }, { data: items }] = await Promise.all([
    admin.from("quotes").select("*").eq("id", id).eq("org_id", orgId!).maybeSingle(),
    admin.from("quote_items").select("*").eq("quote_id", id).eq("org_id", orgId!),
  ]);

  if (!quote) return notFound();

  const { data: customer } = await admin.from("customers").select("first_name,last_name,company_name,phone,email,address_line1,city,state").eq("id", quote.customer_id).single();
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || customer?.company_name || "Unknown";
  const statusColor = STATUS_COLORS[quote.status] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/quotes" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Quote #{id.slice(0,8)}</h1>
          <p className="text-sm text-gray-500">{customerName}</p>
        </div>
        <span className={`text-xs font-semibold rounded-full px-3 py-1 ${statusColor}`}>
          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
        </span>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <p className="text-2xl font-bold text-slate-800">${Number(quote.total_amount).toLocaleString()}</p>
          {customer?.phone && (
            <a href={`tel:${customer.phone}`} className="text-gray-400">📞</a>
          )}
        </div>
        {customer && (
          <p className="text-sm text-gray-500 mb-3">
            {[customer.address_line1, customer.city, customer.state].filter(Boolean).join(", ")}
          </p>
        )}
        {items && items.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{item.description} × {item.quantity}</span>
                <span className="font-medium">${Number(item.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        {quote.notes && <p className="text-sm text-gray-500 mt-3 border-t pt-3">{quote.notes}</p>}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Update Status</p>
        <form action={updateStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="quote_id" value={quote.id} />
          {["draft","sent","accepted","declined"].map(s => (
            <button key={s} name="status" value={s}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${quote.status === s ? "border-transparent " + STATUS_COLORS[s] : "border-gray-200 text-gray-500 bg-white"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </form>
      </div>

      {quote.status !== "declined" && (
        <div className="space-y-3">
          <SendEmailButton
            apiPath={`/api/quotes/${quote.id}/send`}
            label="Send Quote to Customer"
            customerEmail={customer?.email}
          />

          {!quote.invoice_id ? (
            <form action={convertToInvoice}>
              <input type="hidden" name="quote_id" value={quote.id} />
              <button type="submit"
                className="w-full rounded-xl py-3 text-white font-semibold"
                style={{ backgroundColor: "#1B3A6B" }}>
                📄 Convert to Invoice
              </button>
            </form>
          ) : (
            <Link href={`/app/invoices/${quote.invoice_id}`}
              className="flex items-center justify-center rounded-xl py-3 font-semibold bg-green-100 text-green-700">
              ✅ View Invoice
            </Link>
          )}

          <form action={convertToJob} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Convert to Job</p>
            <input type="hidden" name="quote_id" value={quote.id} />
            <input name="job_title" placeholder={`Job title (default: Job from Quote)`}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <input name="scheduled_date" type="date"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <button type="submit"
              className="w-full rounded-xl py-3 text-white font-semibold"
              style={{ backgroundColor: "#22C55E" }}>
              🔨 Schedule Job
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
