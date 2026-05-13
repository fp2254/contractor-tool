import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const INV_STATUS: Record<string, { label: string; color: string }> = {
  unpaid:  { label: "Unpaid",  color: "bg-amber-100 text-amber-700" },
  paid:    { label: "Paid",    color: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700" },
};

export default async function PortalInvoicePage({
  params,
}: {
  params: Promise<{ token: string; invoiceId: string }>;
}) {
  const { token, invoiceId } = await params;
  const admin = createAdminClient();

  const { data: pt } = await admin
    .from("customer_portal_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (!pt) return notFound();
  if (new Date(pt.expires_at) < new Date()) return notFound();
  const revokedAt = (pt as Record<string, unknown>).revoked_at;
  if (revokedAt && new Date(revokedAt as string) <= new Date()) return notFound();

  const [{ data: invoice }, { data: customer }, { data: org }, { data: orgSettings }] = await Promise.all([
    admin.from("invoices")
      .select("id,status,total_amount,invoice_number,due_date,created_at")
      .eq("id", invoiceId)
      .eq("customer_id", pt.customer_id)
      .eq("org_id", pt.org_id)
      .single(),
    admin.from("customers").select("first_name,last_name,company_name,email").eq("id", pt.customer_id).single(),
    admin.from("orgs").select("name,phone").eq("id", pt.org_id).single(),
    admin.from("org_settings").select("primary_phone,business_name").eq("org_id", pt.org_id).maybeSingle(),
  ]);

  if (!invoice) return notFound();

  // Track open
  const { data: alreadyOpened } = await admin
    .from("notes")
    .select("id")
    .eq("org_id", pt.org_id)
    .eq("entity_type", "invoice")
    .eq("entity_id", invoiceId)
    .eq("body", "__opened__")
    .maybeSingle();
  if (!alreadyOpened) {
    await admin.from("notes").insert({ org_id: pt.org_id, entity_type: "invoice", entity_id: invoiceId, body: "__opened__" } as Record<string, unknown>);
  }

  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || customer?.company_name || "Customer";
  const businessName = (orgSettings as Record<string, unknown> | null)?.business_name as string
    || (org as Record<string, unknown> | null)?.name as string
    || "Your Contractor";
  const orgPhone = (orgSettings as Record<string, unknown> | null)?.primary_phone as string | undefined
    ?? (org as Record<string, unknown> | null)?.phone as string | undefined;

  const st = INV_STATUS[invoice.status] ?? { label: invoice.status, color: "bg-gray-100 text-gray-600" };
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const pdfUrl = `/api/portal/${token}/invoice/${invoiceId}/pdf`;
  const invNum = invoice.invoice_number ?? `INV-${invoiceId.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <div style={{ backgroundColor: "#1B3A6B" }} className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white text-base font-bold leading-tight">{businessName}</p>
          <p className="text-blue-200 text-xs mt-0.5">Hi {customer?.first_name || customerName} — your invoice</p>
        </div>
        {orgPhone && (
          <a href={`tel:${orgPhone}`} className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2 text-white text-xs font-semibold">
            📞 Call us
          </a>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-slate-800">{invNum}</p>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${st.color}`}>{st.label}</span>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-slate-800">${Number(invoice.total_amount).toLocaleString()}</p>
              {dueDate && <p className="text-xs text-gray-400">Due {dueDate}</p>}
            </div>
          </div>

          <iframe
            src={pdfUrl}
            className="w-full border-0"
            style={{ height: "75vh", minHeight: 480 }}
            title={`Invoice ${invNum}`}
          />

          <div className="px-5 py-4 border-t border-gray-100">
            <a
              href={pdfUrl}
              download={`${invNum}.pdf`}
              className="block text-center rounded-xl border border-gray-200 py-3 text-sm font-semibold text-slate-600 bg-gray-50"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF
            </a>
          </div>
        </div>

        <div className="text-center pb-8 pt-4">
          <p className="text-xs text-gray-300">
            Powered by{" "}
            <a href="https://trade-base.biz" target="_blank" rel="noopener noreferrer" className="text-gray-400 underline underline-offset-2">
              TradeBase
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
