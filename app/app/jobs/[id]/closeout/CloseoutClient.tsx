"use client";

import { useState } from "react";
import Link from "next/link";

export type InvoiceLine = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type CloseoutPageData = {
  jobId: string;
  jobTitle: string;
  jobAddress: string | null;
  completedAt: string | null;
  customerName: string;
  customerFirstName: string;
  customerEmail: string | null;
  businessName: string;
  templateName: string;
  fieldResponses: { label: string; value: string; field_type: string }[];
  photos: { url: string; filename: string }[];
  notes: string[];
  invoiceLines: InvoiceLine[];
  invoiceBaseTotal: number;
  invoiceSource: "existing" | "quote" | "template" | "fallback";
  existingInvoiceId: string | null;
  warrantyTitle: string;
  warrantyBody: string;
  warrantyLocked: boolean;
  canSend: boolean;
  isOwnerOrAdmin: boolean;
  packageId: string | null;
  packageStatus: "draft" | "sent" | null;
  sentAt: string | null;
  reportId: string | null;
  savedAdjustments: {
    discount: number;
    addon_charge: number;
    addon_desc: string;
    customer_note: string;
    internal_note: string;
  } | null;
  savedWarrantyTitle: string | null;
  savedWarrantyBody: string | null;
};

type Tab = "report" | "invoice" | "warranty";

const SOURCE_LABELS: Record<string, string> = {
  existing: "From linked invoice",
  quote: "From accepted quote",
  template: "From template pricing",
  fallback: "Manual — add amounts below",
};

export function CloseoutClient({ data }: { data: CloseoutPageData }) {
  const [tab, setTab] = useState<Tab>("report");
  const [discount, setDiscount] = useState(data.savedAdjustments?.discount ?? 0);
  const [addonCharge, setAddonCharge] = useState(data.savedAdjustments?.addon_charge ?? 0);
  const [addonDesc, setAddonDesc] = useState(data.savedAdjustments?.addon_desc ?? "");
  const [customerNote, setCustomerNote] = useState(data.savedAdjustments?.customer_note ?? "");
  const [internalNote, setInternalNote] = useState(data.savedAdjustments?.internal_note ?? "");
  const [warrantyTitle, setWarrantyTitle] = useState(data.savedWarrantyTitle ?? data.warrantyTitle);
  const [warrantyBody, setWarrantyBody] = useState(data.savedWarrantyBody ?? data.warrantyBody);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentSuccess, setSentSuccess] = useState(data.packageStatus === "sent");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const effectiveTotal = Math.max(0, data.invoiceBaseTotal - discount + addonCharge);

  function buildPayload() {
    return {
      warranty_title: warrantyTitle,
      warranty_body: warrantyBody,
      report_id: data.reportId,
      invoice_id: data.existingInvoiceId,
      package_data: {
        adjustments: { discount, addon_charge: addonCharge, addon_desc: addonDesc, customer_note: customerNote, internal_note: internalNote },
        invoice_lines: data.invoiceLines,
        invoice_base_total: data.invoiceBaseTotal,
        effective_total: effectiveTotal,
      },
    };
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/app/jobs/${data.jobId}/api/closeout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!data.customerEmail) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/app/jobs/${data.jobId}/api/closeout/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPayload(),
          adjustments: { discount, addon_charge: addonCharge, addon_desc: addonDesc, customer_note: customerNote, internal_note: internalNote },
          invoice_lines: data.invoiceLines,
          invoice_base_total: data.invoiceBaseTotal,
        }),
      });
      const json = await res.json() as { ok?: boolean; sentTo?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      setSentSuccess(true);
      setSentTo(json.sentTo ?? data.customerEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-4 space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/app/jobs/${data.jobId}`} className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Closeout Package</h1>
          <p className="text-sm text-gray-500">{data.jobTitle} · {data.customerName}</p>
        </div>
        {sentSuccess && (
          <span className="text-xs font-semibold rounded-full px-3 py-1 bg-green-100 text-green-700">✓ Sent</span>
        )}
      </div>

      {/* Sent confirmation */}
      {sentSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-green-800">Closeout package sent!</p>
          <p className="text-xs text-green-600 mt-1">
            Sent to {sentTo ?? data.customerEmail}
            {data.sentAt && !sentTo && ` on ${new Date(data.sentAt).toLocaleDateString()}`}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        {(["report", "invoice", "warranty"] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors capitalize ${
              tab === t ? "bg-white text-slate-800 shadow-sm" : "text-gray-500"
            }`}>
            {t === "report" ? "📋 Report" : t === "invoice" ? "💳 Invoice" : "🛡 Warranty"}
          </button>
        ))}
      </div>

      {/* ── Report Tab ─────────────────────────────────────────────────────── */}
      {tab === "report" && (
        <div className="space-y-3">
          {data.fieldResponses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Work Completed</p>
              {data.fieldResponses.map((f, i) => (
                <div key={i} className="border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                  <p className={`text-sm font-medium ${f.value === "Yes" ? "text-green-700" : f.value === "No" ? "text-red-600" : "text-slate-800"}`}>
                    {f.value === "Yes" ? "✓ Yes" : f.value === "No" ? "✕ No" : f.value || <span className="text-gray-300 italic text-xs">Not recorded</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Photos</p>
            {data.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {data.photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt={p.filename} className="w-full aspect-square object-cover rounded-xl" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No photos attached.</p>
            )}
          </div>

          {data.notes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Site Notes</p>
              {data.notes.map((n, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-slate-700">{n}</p>
                </div>
              ))}
            </div>
          )}

          {data.fieldResponses.length === 0 && data.photos.length === 0 && data.notes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No report data recorded.</p>
          )}
        </div>
      )}

      {/* ── Invoice Tab ─────────────────────────────────────────────────────── */}
      {tab === "invoice" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Line Items</p>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{SOURCE_LABELS[data.invoiceSource]}</span>
            </div>
            {data.invoiceLines.map((line, i) => (
              <div key={i} className="flex justify-between items-start gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm text-slate-800">{line.description}</p>
                  {line.quantity !== 1 && <p className="text-xs text-gray-400">× {line.quantity}</p>}
                </div>
                <p className="text-sm font-medium text-slate-800 shrink-0">${line.total.toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Adjustments */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Adjustments</p>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Discount ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Additional Charge</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={addonDesc}
                  onChange={e => setAddonDesc(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$0"
                  value={addonCharge}
                  onChange={e => setAddonCharge(Math.max(0, Number(e.target.value)))}
                  className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Note <span className="font-normal text-gray-400">(shown in email)</span></label>
              <textarea
                rows={2}
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
                placeholder="e.g. Thank you for your business!"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Internal Note <span className="font-normal text-gray-400">(not sent to customer)</span></label>
              <textarea
                rows={2}
                value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
                placeholder="Internal notes for your records…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          </div>

          {/* Total */}
          <div className="bg-[#1B3A6B] rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-200">Total Due</span>
            <span className="text-2xl font-bold text-white">${effectiveTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>

          {data.existingInvoiceId && (
            <Link href={`/app/invoices/${data.existingInvoiceId}`}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 bg-white border border-gray-200 text-slate-700 font-semibold text-sm shadow-sm">
              View Full Invoice →
            </Link>
          )}
        </div>
      )}

      {/* ── Warranty Tab ─────────────────────────────────────────────────────── */}
      {tab === "warranty" && (
        <div className="space-y-3">
          {data.warrantyLocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-amber-500">🔒</span>
              <p className="text-xs text-amber-700 font-medium">Warranty is locked. Owner/Admin can edit warranty terms.</p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Warranty Title</label>
              {data.warrantyLocked ? (
                <p className="text-sm font-medium text-slate-800 bg-gray-50 rounded-xl px-4 py-3">{warrantyTitle || "Warranty & Terms"}</p>
              ) : (
                <input
                  type="text"
                  value={warrantyTitle}
                  onChange={e => setWarrantyTitle(e.target.value)}
                  placeholder="e.g. Warranty & Terms"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Warranty Body</label>
              {data.warrantyLocked ? (
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                  {warrantyBody ? (
                    warrantyBody.split("\n").filter(l => l.trim()).map((line, i) => (
                      <p key={i} className="text-sm text-slate-700">• {line.trim()}</p>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No warranty text set on this template.</p>
                  )}
                </div>
              ) : (
                <textarea
                  rows={8}
                  value={warrantyBody}
                  onChange={e => setWarrantyBody(e.target.value)}
                  placeholder={`One clause per line.\n\nSupported tokens: {customer_name}, {job_address}, {completion_date}, {company_name}, {job_title}, {template_name}`}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                />
              )}
              {!data.warrantyLocked && (
                <p className="text-xs text-gray-400 mt-1">One clause per line. Auto-tokens: {"{customer_name}"}, {"{completion_date}"}, {"{company_name}"}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-2 pt-2">
        {!sentSuccess && (
          <>
            {data.canSend ? (
              data.customerEmail ? (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || saving}
                  className="w-full rounded-xl py-3.5 text-white text-sm font-bold disabled:opacity-60 bg-green-600">
                  {sending ? "Sending…" : `📤 Send to Customer (${data.customerEmail})`}
                </button>
              ) : (
                <div className="w-full rounded-xl py-3 bg-gray-100 text-gray-400 text-sm font-semibold text-center">
                  No customer email on file
                </div>
              )
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 font-medium">Owner/Admin sends the closeout package for this template.</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || sending}
              className="w-full rounded-xl py-3 border border-gray-200 bg-white text-slate-700 text-sm font-semibold disabled:opacity-60">
              {saving ? "Saving…" : "💾 Save Draft"}
            </button>
          </>
        )}

        {sentSuccess && (
          <Link
            href={`/app/jobs/${data.jobId}`}
            className="flex items-center justify-center gap-2 w-full rounded-xl py-3 bg-white border border-gray-200 text-slate-700 font-semibold text-sm shadow-sm">
            ← Back to Job
          </Link>
        )}
      </div>

      {/* TODO Phase 5: PDF generation/download */}
      {/* TODO Phase 5: Customer signature */}
      {/* TODO Phase 5: Payment links */}
      {/* TODO Phase 5: Review request automation */}
    </div>
  );
}
