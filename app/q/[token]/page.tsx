import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptQuoteForm } from "@/components/AcceptQuoteForm";

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: quote } = await admin
    .from("quotes")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (!quote) return notFound();

  const [{ data: items }, { data: org }, { data: settings }, { data: customer }] = await Promise.all([
    admin.from("quote_items").select("*").eq("quote_id", quote.id).eq("org_id", quote.org_id),
    admin.from("orgs").select("name").eq("id", quote.org_id).single(),
    admin.from("org_settings").select("dba_name,logo_url,primary_phone,business_email,address,city,state,zip").eq("org_id", quote.org_id).maybeSingle(),
    admin.from("customers").select("first_name,last_name,company_name,email,address_line1,city,state").eq("id", quote.customer_id).single(),
  ]);

  const businessName = settings?.dba_name || org?.name || "Your Contractor";
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || customer?.company_name || "Valued Customer";

  const subtotal = (items ?? []).reduce((sum, i) => sum + Number(i.total_price), 0);
  const quoteDate = new Date(quote.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const quoteNum = `Q-${quote.id.slice(0, 8).toUpperCase()}`;

  const businessAddress = [settings?.address, settings?.city, settings?.state, settings?.zip].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Branding */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-xl mx-auto px-5 py-5 flex items-center gap-4">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={businessName} className="h-12 w-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
              style={{ backgroundColor: "#1B3A6B" }}>
              {businessName.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">{businessName}</h1>
            {businessAddress && <p className="text-xs text-gray-500 mt-0.5">{businessAddress}</p>}
            {settings?.primary_phone && (
              <a href={`tel:${settings.primary_phone}`} className="text-xs text-gray-500">{settings.primary_phone}</a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* Quote Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quote</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{quoteNum}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Date</p>
              <p className="text-sm font-medium text-slate-700">{quoteDate}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Prepared for</p>
            <p className="font-semibold text-slate-800">{customerName}</p>
            {customer?.email && <p className="text-sm text-gray-500">{customer.email}</p>}
            {customer?.address_line1 && (
              <p className="text-sm text-gray-500">
                {[customer.address_line1, customer.city, customer.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Services & Materials</p>
          </div>
          <div className="divide-y divide-gray-50">
            {(items ?? []).map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.description}</p>
                  {item.quantity !== 1 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-700 shrink-0">
                  ${Number(item.total_price).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 px-5 py-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-800 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>${Number(quote.total_amount ?? subtotal).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-gray-600 leading-relaxed">{quote.notes}</p>
          </div>
        )}

        {/* Accept / Status */}
        <div className="space-y-3">
          <AcceptQuoteForm
            token={token}
            quoteId={quote.id}
            alreadyAccepted={quote.status === "accepted"}
            acceptedAt={quote.accepted_at}
            acceptedSignature={quote.accepted_signature_name}
          />

          <a
            href={`/api/q/${token}/pdf`}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 border-2 border-gray-200 text-slate-600 font-semibold text-sm bg-white"
            download>
            ⬇ Download PDF
          </a>
        </div>

        {/* Powered by */}
        <div className="text-center py-6 space-y-1">
          <p className="text-xs font-semibold text-gray-400">Powered by TradeBase</p>
          <p className="text-xs text-gray-300">Create professional quotes instantly</p>
        </div>
      </div>
    </div>
  );
}
