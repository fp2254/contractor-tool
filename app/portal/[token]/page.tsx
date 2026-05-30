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

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ invoice?: string; quote?: string }>;
}) {
  const { token } = await params;
  const { invoice: filterInvoice, quote: filterQuote } = await searchParams;
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
    admin.from("org_settings").select("primary_phone,business_name").eq("org_id", pt.org_id).maybeSingle(),
  ]);

  // Track first open: insert __opened__ notes for any quote/invoice not yet tracked
  const allDocIds = [
    ...(quotes ?? []).map(q => ({ type: "quote" as const, id: q.id })),
    ...(invoices ?? []).map(inv => ({ type: "invoice" as const, id: inv.id })),
  ];
  if (allDocIds.length > 0) {
    const { data: existingOpens } = await admin
      .from("notes")
      .select("entity_type,entity_id")
      .eq("org_id", pt.org_id)
      .eq("body", "__opened__")
      .in("entity_id", allDocIds.map(d => d.id));
    const openedSet = new Set(
      (existingOpens ?? []).map((n: Record<string, unknown>) => `${n.entity_type}:${n.entity_id}`)
    );
    const newOpens = allDocIds
      .filter(d => !openedSet.has(`${d.type}:${d.id}`))
      .map(d => ({ org_id: pt.org_id, entity_type: d.type, entity_id: d.id, body: "__opened__" }));
    if (newOpens.length > 0) {
      await admin.from("notes").insert(newOpens as Record<string, unknown>[]);
    }
  }

  if (!customer) return notFound();

  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Customer";
  const businessName = (orgSettings as Record<string, unknown> | null)?.business_name as string
    || (org as Record<string, unknown> | null)?.name as string
    || "Your Contractor";
  const orgPhone = (orgSettings as Record<string, unknown> | null)?.primary_phone as string | undefined
    ?? (org as Record<string, unknown> | null)?.phone as string | undefined;

  // Filter out declined quotes — nothing for the customer to do with them
  const visibleQuotes = (quotes ?? []).filter(q =>
    q.status !== "declined" && (!filterQuote || filterQuote === q.id)
  );
  const visibleInvoices = (invoices ?? []).filter(inv =>
    !filterInvoice || filterInvoice === inv.id
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
        details[open] .chevron { transform: rotate(180deg); }
        .chevron { transition: transform 0.2s ease; }
      `}</style>

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

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">

        {/* Invoices — shown first, most actionable */}
        {visibleInvoices.length > 0 && (
          <>
            {!filterInvoice && !filterQuote && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 pb-1">
                Invoices
              </p>
            )}
            {visibleInvoices.map((inv) => {
              const st = INV_STATUS[inv.status] ?? { label: inv.status, color: "bg-gray-100 text-gray-600" };
              const dueDate = inv.due_date
                ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : null;
              const pdfUrl = `/api/portal/${token}/invoice/${inv.id}/pdf`;
              const invNum = inv.invoice_number ?? `INV-${inv.id.slice(0, 8).toUpperCase()}`;
              const dateStr = new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

              return (
                <details key={inv.id} className="bg-white rounded-2xl shadow-sm overflow-hidden group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-slate-800 shrink-0">🧾 {invNum}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-semibold shrink-0 ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-slate-800">${Number(inv.total_amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{dueDate ? `Due ${dueDate}` : dateStr}</p>
                      </div>
                      <svg className="chevron h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </summary>

                  <div className="border-t border-gray-100">
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
                        ⬇ Download PDF
                      </a>
                    </div>
                  </div>
                </details>
              );
            })}
          </>
        )}

        {/* Quotes — hidden entirely when filtering to a specific invoice */}
        {!filterInvoice && visibleQuotes.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 pb-1 pt-2">
              Quotes
            </p>
            {visibleQuotes.map((q) => {
              const st = QUOTE_STATUS[q.status] ?? { label: q.status, color: "bg-gray-100 text-gray-600" };
              const canAct = q.status === "draft" || q.status === "sent";
              const pdfUrl = `/api/portal/${token}/quote/${q.id}/pdf`;
              const quoteNum = `Q-${q.id.slice(0, 8).toUpperCase()}`;
              const dateStr = new Date(q.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

              return (
                <details key={q.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-slate-800 shrink-0">📋 {quoteNum}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-semibold shrink-0 ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-slate-800">${Number(q.total_amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{dateStr}</p>
                      </div>
                      <svg className="chevron h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </summary>

                  <div className="border-t border-gray-100">
                    <iframe
                      src={pdfUrl}
                      className="w-full border-0"
                      style={{ height: "75vh", minHeight: 480 }}
                      title={`Quote ${quoteNum}`}
                    />

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
                              ⬇ Download PDF
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
                          ⬇ Download PDF
                        </a>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </>
        )}

        {(visibleQuotes.length === 0 && visibleInvoices.length === 0) && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No documents yet. Check back soon.</p>
          </div>
        )}

        <div className="text-center pb-8 pt-4">
          <p className="text-xs text-gray-300">
            Powered by{" "}
            <a href="https://trade-base.biz" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-500 underline underline-offset-2">
              TradeBase
            </a>
          </p>
          <p className="text-xs text-gray-300 mt-0.5">The operating system for contractors</p>
        </div>
      </div>
    </div>
  );
}
