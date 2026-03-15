import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignatureCapture } from "@/components/SignatureCapture";

async function declineQuote(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const quoteId = String(formData.get("quote_id"));
  const admin = createAdminClient();

  const { data: pt } = await admin
    .from("customer_portal_tokens")
    .select("customer_id,org_id,expires_at")
    .eq("token", token)
    .single();

  if (!pt || new Date(pt.expires_at) < new Date()) return;

  const { data: quote } = await admin
    .from("quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("customer_id", pt.customer_id)
    .eq("org_id", pt.org_id)
    .single();

  if (!quote) return;

  await admin
    .from("quotes")
    .update({ status: "declined", declined_at: new Date().toISOString() })
    .eq("id", quoteId);

  revalidatePath(`/portal/${token}`);
}

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: "Draft",    color: "bg-gray-100 text-gray-600" },
  sent:     { label: "Sent",     color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700" },
};

const INV_STATUS: Record<string, { label: string; color: string }> = {
  unpaid:  { label: "Unpaid",  color: "bg-amber-100 text-amber-700" },
  paid:    { label: "Paid",    color: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700" },
};

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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

  const [
    { data: customer },
    { data: quotes },
    { data: invoices },
    { data: org },
    { data: orgSettings },
  ] = await Promise.all([
    admin.from("customers").select("first_name,last_name,company_name,email").eq("id", pt.customer_id).single(),
    admin.from("quotes").select("id,status,total_amount,created_at").eq("customer_id", pt.customer_id).eq("org_id", pt.org_id).order("created_at", { ascending: false }),
    admin.from("invoices").select("id,status,total_amount,invoice_number,due_date,created_at").eq("customer_id", pt.customer_id).eq("org_id", pt.org_id).order("created_at", { ascending: false }),
    admin.from("orgs").select("name,phone").eq("id", pt.org_id).single(),
    admin.from("org_settings").select("primary_phone").eq("org_id", pt.org_id).maybeSingle(),
  ]);

  if (!customer) return notFound();

  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Customer";
  const businessName = (org as Record<string, unknown> | null)?.name as string ?? "Your Contractor";
  const orgPhone = (orgSettings as Record<string, unknown> | null)?.primary_phone as string | undefined
    ?? (org as Record<string, unknown> | null)?.phone as string | undefined;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div style={{ backgroundColor: "#1B3A6B" }} className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white text-base font-bold leading-tight">{businessName}</p>
          <p className="text-blue-200 text-xs mt-0.5">Hi {customer.first_name || customerName} — your documents</p>
        </div>
        {orgPhone && (
          <a href={`tel:${orgPhone}`} className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2 text-white text-xs font-semibold">
            📞 Call us
          </a>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* Quotes */}
        {quotes && quotes.length > 0 && quotes.map((q) => {
          const st = QUOTE_STATUS[q.status] ?? { label: q.status, color: "bg-gray-100 text-gray-600" };
          const canAct = q.status === "draft" || q.status === "sent";
          const pdfUrl = `/api/portal/${token}/quote/${q.id}/pdf`;
          const quoteNum = `Q-${q.id.slice(0, 8).toUpperCase()}`;
          const dateStr = new Date(q.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

          return (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Quote meta row */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-slate-800">{quoteNum}</p>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${st.color}`}>{st.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-slate-800">${Number(q.total_amount).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{dateStr}</p>
                </div>
              </div>

              {/* PDF embedded inline */}
              <iframe
                src={pdfUrl}
                className="w-full border-0"
                style={{ height: "75vh", minHeight: 480 }}
                title={`Quote ${quoteNum}`}
              />

              {/* Actions */}
              <div className="px-5 py-4 space-y-3 border-t border-gray-100">
                {canAct ? (
                  <>
                    <SignatureCapture
                      token={token}
                      quoteId={q.id}
                      quoteNum={`#${q.id.slice(0, 8).toUpperCase()}`}
                      large
                    />
                    <div className="flex gap-2">
                      <a
                        href={pdfUrl}
                        download={`${quoteNum}.pdf`}
                        className="flex-1 text-center rounded-xl border border-gray-200 py-3 text-sm font-semibold text-slate-600 bg-gray-50"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download PDF
                      </a>
                      <form action={declineQuote} className="flex-1">
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="quote_id" value={q.id} />
                        <button
                          type="submit"
                          className="w-full rounded-xl py-3 text-sm font-semibold text-red-500 border border-red-200 bg-red-50">
                          Decline
                        </button>
                      </form>
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      Accepting this quote authorizes work to proceed. Your signature is recorded.
                    </p>
                  </>
                ) : (
                  <a
                    href={pdfUrl}
                    download={`${quoteNum}.pdf`}
                    className="block text-center rounded-xl border border-gray-200 py-3 text-sm font-semibold text-slate-600 bg-gray-50"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {/* Invoices */}
        {invoices && invoices.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Invoices</p>
            <div className="space-y-4">
              {invoices.map((inv) => {
                const st = INV_STATUS[inv.status] ?? { label: inv.status, color: "bg-gray-100 text-gray-600" };
                const dueDate = inv.due_date
                  ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : null;
                const pdfUrl = `/api/portal/${token}/invoice/${inv.id}/pdf`;
                const invNum = inv.invoice_number ?? `#${inv.id.slice(0, 8).toUpperCase()}`;

                return (
                  <div key={inv.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-slate-800">{invNum}</p>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-slate-800">${Number(inv.total_amount).toLocaleString()}</p>
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
                );
              })}
            </div>
          </div>
        )}

        {(!quotes?.length && !invoices?.length) && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No documents yet. Check back soon.</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 pb-6">Powered by TradeBase</p>
      </div>
    </div>
  );
}
