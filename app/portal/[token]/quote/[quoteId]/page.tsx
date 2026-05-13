import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignatureCapture } from "@/components/SignatureCapture";

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: "Draft",    color: "bg-gray-100 text-gray-600" },
  sent:     { label: "Sent",     color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700" },
};

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

  await admin.from("quotes").update({ status: "declined", declined_at: new Date().toISOString() }).eq("id", quoteId);
  revalidatePath(`/portal/${token}/quote/${quoteId}`);
}

export default async function PortalQuotePage({
  params,
}: {
  params: Promise<{ token: string; quoteId: string }>;
}) {
  const { token, quoteId } = await params;
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

  const [{ data: quote }, { data: customer }, { data: org }, { data: orgSettings }] = await Promise.all([
    admin.from("quotes")
      .select("id,status,total_amount,created_at")
      .eq("id", quoteId)
      .eq("customer_id", pt.customer_id)
      .eq("org_id", pt.org_id)
      .single(),
    admin.from("customers").select("first_name,last_name,company_name,email").eq("id", pt.customer_id).single(),
    admin.from("orgs").select("name,phone").eq("id", pt.org_id).single(),
    admin.from("org_settings").select("primary_phone,business_name").eq("org_id", pt.org_id).maybeSingle(),
  ]);

  if (!quote) return notFound();

  // Track open
  const { data: alreadyOpened } = await admin
    .from("notes")
    .select("id")
    .eq("org_id", pt.org_id)
    .eq("entity_type", "quote")
    .eq("entity_id", quoteId)
    .eq("body", "__opened__")
    .maybeSingle();
  if (!alreadyOpened) {
    await admin.from("notes").insert({ org_id: pt.org_id, entity_type: "quote", entity_id: quoteId, body: "__opened__" } as Record<string, unknown>);
  }

  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || customer?.company_name || "Customer";
  const businessName = (orgSettings as Record<string, unknown> | null)?.business_name as string
    || (org as Record<string, unknown> | null)?.name as string
    || "Your Contractor";
  const orgPhone = (orgSettings as Record<string, unknown> | null)?.primary_phone as string | undefined
    ?? (org as Record<string, unknown> | null)?.phone as string | undefined;

  const st = QUOTE_STATUS[quote.status] ?? { label: quote.status, color: "bg-gray-100 text-gray-600" };
  const canAct = quote.status === "draft" || quote.status === "sent";
  const pdfUrl = `/api/portal/${token}/quote/${quoteId}/pdf`;
  const quoteNum = `Q-${quoteId.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <div style={{ backgroundColor: "#1B3A6B" }} className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white text-base font-bold leading-tight">{businessName}</p>
          <p className="text-blue-200 text-xs mt-0.5">Hi {customer?.first_name || customerName} — your quote</p>
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
              <p className="text-sm font-bold text-slate-800">{quoteNum}</p>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${st.color}`}>{st.label}</span>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-slate-800">${Number(quote.total_amount).toLocaleString()}</p>
              <p className="text-xs text-gray-400">{new Date(quote.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>

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
                  quoteId={quoteId}
                  quoteNum={`#${quoteId.slice(0, 8).toUpperCase()}`}
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
                    <input type="hidden" name="quote_id" value={quoteId} />
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
