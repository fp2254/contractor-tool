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
    { count: jobCount },
  ] = await Promise.all([
    admin.from("customers").select("first_name,last_name,company_name,email").eq("id", pt.customer_id).single(),
    admin.from("quotes").select("id,status,total_amount,notes,scope_items,estimated_time,created_at").eq("customer_id", pt.customer_id).eq("org_id", pt.org_id).order("created_at", { ascending: false }),
    admin.from("invoices").select("id,status,total_amount,invoice_number,due_date,created_at").eq("customer_id", pt.customer_id).eq("org_id", pt.org_id).order("created_at", { ascending: false }),
    admin.from("orgs").select("name,phone,created_at").eq("id", pt.org_id).single(),
    admin.from("org_settings").select("license_number,insurance_number,primary_phone").eq("org_id", pt.org_id).maybeSingle(),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("org_id", pt.org_id),
  ]);

  if (!customer) return notFound();

  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Customer";
  const businessName = (org as Record<string, unknown> | null)?.name as string ?? "Your Contractor";
  const orgPhone = (orgSettings as Record<string, unknown> | null)?.primary_phone as string | undefined
    ?? (org as Record<string, unknown> | null)?.phone as string | undefined;

  const s = orgSettings as Record<string, unknown> | null;
  const isLicensed = !!(s?.license_number || s?.insurance_number);
  const orgCreatedAt = (org as Record<string, unknown> | null)?.created_at as string | undefined;
  const servingSince = orgCreatedAt ? new Date(orgCreatedAt).getFullYear() : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ backgroundColor: "#1B3A6B" }} className="px-5 py-6">
        <p className="text-white text-xl font-bold">{businessName}</p>
        <p className="text-blue-200 text-sm mt-0.5">Customer Portal</p>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-lg font-bold text-slate-800">Hi {customer.first_name || customerName}</p>
          <p className="text-sm text-gray-500 mt-1">Here are your documents from {businessName}.</p>
          {orgPhone && <p className="text-xs text-gray-400 mt-2">Questions? Call {orgPhone}</p>}
        </div>

        {/* Contractor Credibility */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">About {businessName}</p>
          <div className="flex flex-wrap gap-3">
            {isLicensed && (
              <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                <span className="text-green-600 text-base">✓</span>
                <span className="text-xs font-semibold text-green-800">Licensed & Insured</span>
              </div>
            )}
            {(jobCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                <span className="text-blue-600 text-base">🔧</span>
                <span className="text-xs font-semibold text-blue-800">{(jobCount ?? 0).toLocaleString()} jobs completed</span>
              </div>
            )}
            {servingSince && (
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                <span className="text-slate-500 text-base">📅</span>
                <span className="text-xs font-semibold text-slate-700">Serving since {servingSince}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quotes */}
        {quotes && quotes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 pt-4 pb-2">
              Estimates & Quotes
            </p>
            <div className="divide-y divide-gray-100">
              {quotes.map((q) => {
                const st = QUOTE_STATUS[q.status] ?? { label: q.status, color: "bg-gray-100 text-gray-600" };
                const canAct = q.status === "draft" || q.status === "sent";
                const scopeRaw = (q as Record<string, unknown>).scope_items as string | null | undefined;
                const scopeBullets = scopeRaw ? scopeRaw.split("\n").map(s => s.trim()).filter(Boolean) : [];
                const estTime = (q as Record<string, unknown>).estimated_time as string | null | undefined;

                return (
                  <div key={q.id} className="px-5 py-4">
                    {/* Quote header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Quote #{q.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        {q.notes && <p className="text-xs text-gray-500 mt-1">{q.notes}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-slate-800">${Number(q.total_amount).toLocaleString()}</p>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${st.color}`}>{st.label}</span>
                      </div>
                    </div>

                    {/* Scope of Work */}
                    {scopeBullets.length > 0 && (
                      <div className="bg-slate-50 rounded-xl px-4 py-3 mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What This Includes</p>
                        <ul className="space-y-1">
                          {scopeBullets.map((bullet, bi) => (
                            <li key={bi} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Estimated Install Time */}
                    {estTime && (
                      <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-2.5 mb-3">
                        <span className="text-amber-600 text-base">⏱</span>
                        <div>
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Estimated Install Time</p>
                          <p className="text-sm font-bold text-slate-800">{estTime}</p>
                        </div>
                      </div>
                    )}

                    {/* Accept / Decline actions */}
                    {canAct && (
                      <div className="space-y-2 mt-3">
                        <SignatureCapture
                          token={token}
                          quoteId={q.id}
                          quoteNum={`#${q.id.slice(0, 8).toUpperCase()}`}
                          large
                        />
                        <div className="flex gap-2">
                          <a
                            href={`/api/portal/${token}/quote/${q.id}/pdf`}
                            className="flex-1 text-center rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-slate-600 bg-gray-50"
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
                              className="w-full rounded-xl py-2.5 text-xs font-semibold text-red-500 border border-red-200 bg-red-50">
                              Decline
                            </button>
                          </form>
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                          Accepting this quote authorizes work to proceed. Your signature is recorded.
                        </p>
                      </div>
                    )}

                    {/* Already actioned — just show PDF */}
                    {!canAct && (
                      <a
                        href={`/api/portal/${token}/quote/${q.id}/pdf`}
                        className="mt-3 block text-center rounded-xl border border-gray-200 py-2 text-xs font-semibold text-slate-600 bg-gray-50"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Invoices */}
        {invoices && invoices.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 pt-4 pb-2">
              Invoices
            </p>
            <div className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const st = INV_STATUS[inv.status] ?? { label: inv.status, color: "bg-gray-100 text-gray-600" };
                const dueDate = inv.due_date
                  ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : null;
                return (
                  <div key={inv.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{inv.invoice_number ?? `#${inv.id.slice(0,8).toUpperCase()}`}</p>
                        {dueDate && <p className="text-xs text-gray-400">Due {dueDate}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-slate-800">${Number(inv.total_amount).toLocaleString()}</p>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${st.color}`}>{st.label}</span>
                      </div>
                    </div>
                    <a
                      href={`/api/portal/${token}/invoice/${inv.id}/pdf`}
                      className="block text-center rounded-xl border border-gray-200 py-2 text-xs font-semibold text-slate-600 bg-gray-50"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download PDF
                    </a>
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
